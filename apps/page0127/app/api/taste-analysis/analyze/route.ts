import { NextRequest, NextResponse } from 'next/server';

import { getBookProvider } from '@/shared/api/book-provider';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import { estimateJsonProgress } from '@/shared/lib/ai/analysisEvents';
import { streamAnalysis } from '@/shared/lib/ai/analysisStream';
import {
  AiIncompleteError,
  calculateAiCostCents,
  streamClaudeJson,
} from '@/shared/lib/ai/claude';
import {
  createTasteAnalysisPrompt,
  createTasteAnalysisSchema,
  TASTE_ANALYSIS_PROGRESS,
} from '@/shared/lib/ai/prompts/taste-analysis';
import {
  BUDGET_EXCEEDED_ERROR,
  isUnbilledAiFailure,
  refundUsage,
  reserveUsage,
  USAGE_LIMIT_EXCEEDED_ERROR,
} from '@/shared/lib/aiUsage';
import { notifyBudgetIfCrossed } from '@/shared/lib/kakao-alert/notifyBudget';

import { isRated } from '@/entities/book';
import { TASTE_ANALYSIS_MIN_BOOKS } from '@/entities/taste-analysis/model/analysisGate';
import {
  BOOK_SELECTION_VERSION,
  LASTING_BOOKS_FOR_ANALYSIS,
  RECENT_BOOKS_FOR_ANALYSIS,
} from '@/entities/taste-analysis/model/bookSelection';
import {
  toBookKey,
  toTasteEvidence,
} from '@/entities/taste-analysis/model/evidence';
import { READING_PERSONALITY_TYPES } from '@/entities/taste-analysis/model/personalityTypes';
import { RECOMMENDATIONS_REQUEST_COUNT } from '@/entities/taste-analysis/model/recommendations';

import type { Book, ProviderBook } from '@/entities/book';
import type { BookSelectionMeta } from '@/entities/taste-analysis/model/bookSelection';
import type { SupabaseClient } from '@supabase/supabase-js';

// AI 답을 기다리는 데 수십 초가 걸릴 수 있어 플랫폼 기본 타임아웃(짧으면 10초)보다 길게 둔다.
// 스트리밍이어도 이 상한은 스트림 전체(답 쓰기 + 저장 + 표지 찾기)에 그대로 걸린다.
export const maxDuration = 60;

/** 추천 도서 표지 보강을 "완료" 줄을 보내기 전에 기다리는 최대 시간 */
const ENRICH_WAIT_MS = 8_000;

/** 공급자 API 동시 호출 수 — 표지를 빨리 채우되 한 번에 몰아 보내지 않는다 */
const ENRICH_CONCURRENCY = 3;

const ANALYSIS_ERROR_MESSAGE = '취향 분석 중 오류가 발생했습니다.';

/** AI 응답 모양 — createTasteAnalysisSchema 와 같다 */
type TasteAnalysisResponse = {
  personality_type: string;
  personality_description: string;
  preference_profile?: {
    liked?: { topics?: string[] };
    [key: string]: unknown;
  };
  evidence?: unknown;
  recommendations?: {
    type: string;
    title: string;
    author?: string;
    reason: string;
    display_order: number;
  }[];
};

/**
 * 독서 취향 분석 API
 *
 * 학습 포인트:
 * - Claude API 로 완독한 책 목록을 분석한다
 * - 미리 알 수 있는 실패(로그인·책 수·월 한도)는 스트림을 열기 전에 평소 JSON(4xx)으로 돌려준다
 * - 그다음부터는 NDJSON 스트림으로 단계·진행률을 보내고, 끝나면 { type: 'done' } 한 줄을 보낸다
 * - 분석 결과를 DB에 저장 (캐싱)
 *
 * POST /api/taste-analysis/analyze
 */
export async function POST(request: NextRequest) {
  // 1. 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: '로그인이 필요합니다.' },
      { status: 401 }
    );
  }

  // 2. 분석할 책 고르기 (최소 5권 필요) — 기준은 entities/taste-analysis/model/bookSelection
  //    "요즘 읽은 책" 최근 40권 + 그 전에 읽은 인생책·5점 "오래 남은 책" 최대 10권
  const selected = await selectBooksForAnalysis(supabase, user.id);

  if ('error' in selected) {
    console.error('책 목록 조회 실패:', selected.error);
    return NextResponse.json(
      { error: '책 목록을 불러올 수 없습니다.' },
      { status: 500 }
    );
  }

  const { recentBooks, lastingBooks } = selected;
  // 번호(B1, B2…)는 이 순서로 붙는다 — 프롬프트와 근거 책 맞추기가 같은 배열을 봐야 한다
  const books = [...recentBooks, ...lastingBooks];

  if (books.length < TASTE_ANALYSIS_MIN_BOOKS) {
    return NextResponse.json(
      {
        error: `분석을 위해 최소 ${TASTE_ANALYSIS_MIN_BOOKS}권의 완독한 책(별점 포함)이 필요합니다.`,
      },
      { status: 400 }
    );
  }

  // 2-1. 이번 달 슬롯을 원자적으로 예약한다 (AI 호출 전).
  //      동시 요청이 한도를 넘겨 유료 API를 중복 호출하는 것을 원천 차단한다.
  const reservation = await reserveUsage(supabase, 'taste_analysis');
  if (!reservation.allowed) {
    // 개인 한도와 전역 예산은 사용자에게 다른 말을 해야 한다 — 횟수가 남아
    // 있는데 "횟수를 다 썼다"고 하면 자기 화면(3/3 남음)과 어긋나 고장으로 읽힌다.
    return NextResponse.json(
      {
        error:
          reservation.reason === 'budget'
            ? BUDGET_EXCEEDED_ERROR
            : USAGE_LIMIT_EXCEEDED_ERROR,
      },
      { status: 429 }
    );
  }
  const reservedUsageId = reservation.usageId;

  // 여기서부터는 스트림 — 실패는 { type: 'error' } 줄로 보낸다
  return streamAnalysis(async (send) => {
    // AI 요청을 시작하면 비용이 발생할 수 있으므로 이후 실패는 환불하지 않는다.
    let aiRequestStarted = false;
    // 단, AI 가 과금 없이 반려한 경우(잘못된 키·한도 초과 등)는 예외적으로 환불한다.
    let refundableRejection = false;

    try {
      // 3. AI 분석 실행 — 성향 타입은 고정 카탈로그에서 고르게 한다(스키마 enum)
      //    0("평가 안 함")은 점수가 아니므로 null 로 프롬프트에 넘긴다.
      //    인생책은 별도 컬럼(is_life_book)이라 여기서는 rating 그대로 쓴다.
      const prompt = createTasteAnalysisPrompt(
        // key: 응답이 근거 책을 번호로 고르게 한다 — 지어낸 책이 근거로 들어오지 않는다
        books.map((book, index) => ({
          key: toBookKey(index),
          period: index < recentBooks.length ? 'recent' : 'lasting',
          title: book.title,
          author: book.author,
          category: book.category,
          score: isRated(book.rating) ? book.rating : null,
          description: book.description,
          toc: book.toc,
        })),
        READING_PERSONALITY_TYPES,
        RECOMMENDATIONS_REQUEST_COUNT
      );

      send({ type: 'stage', stage: 'analyzing' });
      aiRequestStarted = true;
      const {
        data: aiResponse,
        usage,
        model,
      } = await streamClaudeJson<TasteAnalysisResponse>({
        system: '당신은 독서 취향 분석 전문가입니다. JSON 형식으로 응답하세요.',
        prompt,
        schema: createTasteAnalysisSchema(
          READING_PERSONALITY_TYPES.map((type) => type.name)
        ),
        // AI 가 쓴 키·추천 제목 수로 진행률을 잰다 — 추천은 세 종류 × RECOMMENDATIONS_REQUEST_COUNT 권
        onText: (snapshot) =>
          send({
            type: 'progress',
            ratio: estimateJsonProgress(
              snapshot,
              TASTE_ANALYSIS_PROGRESS.milestones,
              {
                key: TASTE_ANALYSIS_PROGRESS.repeatKey,
                expected: RECOMMENDATIONS_REQUEST_COUNT * 3,
                from: TASTE_ANALYSIS_PROGRESS.from,
                to: TASTE_ANALYSIS_PROGRESS.to,
              }
            ),
          }),
      });

      send({ type: 'stage', stage: 'saving' });

      // 4. AI 응답 검증 및 로깅 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.warn('AI 응답 구조:', {
          personality_type: aiResponse.personality_type,
          has_preference_profile: !!aiResponse.preference_profile,
          recommendations_count: aiResponse.recommendations?.length || 0,
        });
      }

      // 4-1. 근거 책 — 번호를 실제 책과 맞추고, 못 맞춘 것(지어낸 책)은 버린다.
      //      preference_profile 안에 둔다(JSONB) — 마이그레이션 없이 옛 분석과 나란히 산다
      const evidence = toTasteEvidence(
        aiResponse.evidence,
        books.map((book) => ({
          id: book.id,
          title: book.title,
          cover_image: book.cover_image,
          // 표지를 작은 YES24 사본으로 그리려면 상품번호도 함께 남겨야 한다
          provider_item_id: book.provider_item_id ?? null,
        })),
        aiResponse.preference_profile?.liked?.topics ?? []
      );
      // 선정 기준도 함께 남긴다 — 취향 변화 기록에서 기준이 바뀐 지점을 구분할 수 있게
      const selection: BookSelectionMeta = {
        version: BOOK_SELECTION_VERSION,
        recent_count: recentBooks.length,
        lasting_count: lastingBooks.length,
      };
      const preferenceProfile = aiResponse.preference_profile
        ? { ...aiResponse.preference_profile, evidence, selection }
        : aiResponse.preference_profile;

      // 5. 분석 결과 저장
      const costInCents = calculateAiCostCents(usage);
      const { data: analysis, error: analysisError } = await supabase
        .from('taste_analyses')
        .insert({
          user_id: user.id,
          personality_type: aiResponse.personality_type,
          personality_description: aiResponse.personality_description,
          preference_profile: preferenceProfile,
          analyzed_books_count: books.length,
          analysis_model: model,
          cost_in_cents: costInCents,
        })
        .select()
        .single();

      if (analysisError) {
        console.error('분석 결과 저장 실패:', analysisError);
        send({ type: 'error', message: '분석 결과를 저장할 수 없습니다.' });
        return;
      }

      // 6. 추천 도서 저장
      let enrichment: Promise<void> | null = null;
      if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
        const recommendations = aiResponse.recommendations.map((rec) => ({
          taste_analysis_id: analysis.id,
          recommendation_type: rec.type,
          isbn: null, // AI는 제목/저자만 제공 (ISBN 없음)
          title: rec.title,
          author: rec.author || null,
          publisher: null,
          cover_image: null,
          category: null,
          reason: rec.reason,
          display_order: rec.display_order,
        }));

        const { error: recError } = await supabase
          .from('book_recommendations')
          .insert(recommendations);

        if (recError) {
          console.error('추천 도서 저장 실패:', recError);
        } else {
          // 7. 도서 공급자로 표지 이미지 업데이트
          // "완료" 줄을 보내기 전에 기다린다 — 받자마자 결과 페이지로 이동하므로, 먼저 보내면
          // 페이지가 표지 없는 행을 읽어 새로고침해야 표지가 보인다.
          // 대신 병렬로 돌리고 상한(ENRICH_WAIT_MS)을 둔다. 넘기면 남은 작업은 "완료" 뒤에
          // 마저 기다린다 — 스트림 작업 전체가 after() 안이라 함수가 끝까지 살아 있다.
          send({ type: 'stage', stage: 'covers' });
          enrichment = enrichRecommendationsWithProviderData(
            supabase,
            aiResponse.recommendations,
            analysis.id
          ).catch((err: unknown) => {
            console.error('공급자 데이터 업데이트 실패:', err);
          });
          await Promise.race([
            enrichment,
            new Promise((resolve) => setTimeout(resolve, ENRICH_WAIT_MS)),
          ]);
        }
      } else {
        console.warn('AI 응답에 추천 도서가 없습니다.');
      }

      // 8. 완료 — 화면은 이 줄을 받으면 결과 페이지로 간다
      send({ type: 'done', analysisId: analysis.id });

      // 8-1. 응답 뒤에 마저 할 일: 남은 표지 채우기, 월 예산 80%·100% 를 건넜으면 운영자에게 카톡
      await enrichment;
      try {
        await notifyBudgetIfCrossed(costInCents, request.nextUrl.origin);
      } catch (err: unknown) {
        console.error('AI 예산 알림 발송 실패:', err);
      }
    } catch (error) {
      console.error('취향 분석 실패:', error);
      refundableRejection = isUnbilledAiFailure(error);
      send({ type: 'error', message: toAnalysisErrorMessage(error) });
    } finally {
      // 환불 조건 두 가지:
      // (1) AI 요청을 시작하기 전에 실패한 경우
      // (2) AI 가 토큰을 쓰지 않고 반려한 경우 (401·429·400 등)
      // 그 밖의 실패는 비용이 발생했을 수 있으므로 사용량을 유지한다.
      // 환불 정리가 스트림을 깨뜨리지 않도록 자체 try로 감싼다.
      if ((!aiRequestStarted || refundableRejection) && reservedUsageId) {
        try {
          await refundUsage(createAdminClient(), reservedUsageId);
        } catch (refundError) {
          console.error('AI 사용량 환불 처리 실패:', refundError);
        }
      }
    }
  }, ANALYSIS_ERROR_MESSAGE);
}

/** 실패 종류 → 사용자 문구 */
function toAnalysisErrorMessage(error: unknown): string {
  if (error instanceof AiIncompleteError && error.reason === 'refusal') {
    return '이 책장으로는 분석을 마치지 못했어요. 잠시 후 다시 시도해주세요.';
  }
  return ANALYSIS_ERROR_MESSAGE;
}

/**
 * 분석할 책을 두 칸으로 고른다.
 *
 * 정렬: 완독일 → 완독 연도 → 등록일, 모두 최근 순.
 * NULL 은 반드시 뒤로 보낸다(nullsFirst: false). Postgres 는 내림차순에서 NULL 을
 * 맨 앞에 두는 게 기본값(NULLS FIRST)이라, 빠뜨리면 완독일을 "연도만/모름"으로 넣은
 * 책이 최근 책보다 먼저 자리를 차지한다 — 예전 코드가 그랬다.
 *
 * "오래 남은 책"은 요즘 칸이 꽉 찼을 때만 찾는다. 덜 찼으면 이미 모든 책이 들어갔다.
 */
async function selectBooksForAnalysis(
  supabase: SupabaseClient,
  userId: string
): Promise<{ recentBooks: Book[]; lastingBooks: Book[] } | { error: unknown }> {
  // 평가(rating) 있는 완독 책 — 0("평가 안 함")도 게이트에선 센다(analysisGate)
  const ratedCompleted = () =>
    supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('rating', 'is', null)
      .order('completed_date', { ascending: false, nullsFirst: false })
      .order('completed_year', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

  const { data: recent, error: recentError } = await ratedCompleted().limit(
    RECENT_BOOKS_FOR_ANALYSIS
  );
  if (recentError) return { error: recentError };

  const recentBooks = (recent ?? []) as Book[];
  if (recentBooks.length < RECENT_BOOKS_FOR_ANALYSIS) {
    return { recentBooks, lastingBooks: [] };
  }

  const { data: lasting, error: lastingError } = await ratedCompleted()
    .or('is_life_book.eq.true,rating.eq.5')
    .not('id', 'in', `(${recentBooks.map((book) => book.id).join(',')})`)
    .limit(LASTING_BOOKS_FOR_ANALYSIS);
  if (lastingError) return { error: lastingError };

  return { recentBooks, lastingBooks: (lasting ?? []) as Book[] };
}

/**
 * 공급자 API로 추천 도서 정보 보강 (표지, ISBN, 출판사)
 *
 * 학습 포인트:
 * - 제목+저자로 공급자 API 검색
 * - 검색 결과에서 책 정보 추출
 * - DB 업데이트 (표지, ISBN, 출판사)
 */
async function enrichRecommendationsWithProviderData(
  supabase: SupabaseClient,
  recommendations: Array<{
    type: string;
    title: string;
    author?: string;
    reason: string;
    display_order: number;
  }>,
  tasteAnalysisId: string
): Promise<void> {
  const provider = getBookProvider();

  /** 공급자 검색 1회 — 결과가 없으면 null */
  const searchProvider = async (
    query: string
  ): Promise<ProviderBook | null> => {
    try {
      const result = await provider.search(query, { maxResults: 3 });
      // 검색 결과에서 첫 번째 책 사용 (제목이 가장 유사)
      return result.items[0] ?? null;
    } catch (error) {
      console.error(`도서 검색 실패 (${query}):`, error);
      return null;
    }
  };

  const enrichOne = async (rec: (typeof recommendations)[number]) => {
    try {
      // 1차: 제목만으로 검색. 실패하면 저자를 붙여 한 번 더 시도한다.
      //   AI가 부제를 붙이거나 띄어쓰기를 다르게 쓰면 0건이 나오는데,
      //   그걸 "존재하지 않는 책"으로 단정하고 지우면 섹션이 빈 채로 남는다.
      let matchedBook = await searchProvider(rec.title);

      if (!matchedBook) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const fallbackQuery = rec.author
          ? `${rec.title} ${rec.author}`
          : rec.title;
        matchedBook = await searchProvider(fallbackQuery);
      }

      if (matchedBook) {
        // DB 업데이트 (공급자 정보로 덮어쓰기)
        const { error: updateError } = await supabase
          .from('book_recommendations')
          .update({
            isbn: matchedBook.isbn,
            title: matchedBook.title,
            author: matchedBook.author,
            cover_image: matchedBook.coverImage || null,
            provider_item_id: matchedBook.providerItemId,
            publisher: matchedBook.publisher,
            category: matchedBook.category,
          })
          .eq('taste_analysis_id', tasteAnalysisId)
          .eq('title', rec.title)
          .eq('recommendation_type', rec.type)
          .eq('display_order', rec.display_order);

        if (updateError) {
          console.error(`DB 업데이트 실패 (${rec.title}):`, updateError);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(
            `✅ ${matchedBook.title} (${matchedBook.author}) - 공급자 정보 업데이트 완료`
          );
        }
      } else {
        // 공급자에서 찾을 수 없는 책은 삭제
        const { error: deleteError } = await supabase
          .from('book_recommendations')
          .delete()
          .eq('taste_analysis_id', tasteAnalysisId)
          .eq('title', rec.title)
          .eq('recommendation_type', rec.type)
          .eq('display_order', rec.display_order);

        if (deleteError) {
          console.error(`삭제 실패 (${rec.title}):`, deleteError);
        } else {
          console.warn(`❌ ${rec.title} - 공급자에서 찾을 수 없어 삭제`);
        }
      }
    } catch (error) {
      console.error(`공급자 API 오류 (${rec.title}):`, error);
    }
  };

  // 작업 큐를 ENRICH_CONCURRENCY 개의 일꾼이 나눠 처리한다.
  // 순차(권당 ~0.5초 × 12권)면 6초 남짓, 3개씩이면 2초 안팎이다.
  const queue = [...recommendations];
  const worker = async () => {
    for (let rec = queue.shift(); rec; rec = queue.shift()) {
      await enrichOne(rec);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, queue.length) }, worker)
  );
}
