import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import {
  refundUsage,
  reserveUsage,
  USAGE_LIMIT_EXCEEDED_ERROR,
} from '@/shared/lib/aiUsage';
import { AI_MODEL, MAX_TOKENS, openai, TEMPERATURE } from '@/shared/lib/openai';
import { createCompatibilityPrompt } from '@/shared/lib/openai/prompts/compatibility';

import { getCompatibilityTypeByScore } from '@/entities/compatibility/model/compatibilityTypes';

import type { Book } from '@/entities/book';

// gpt-4o + max_tokens 4000 응답은 경우에 따라 수십 초가 걸릴 수 있어
// 배포 플랫폼 기본 함수 타임아웃(짧으면 10초)에 걸려 강제 종료되는 것을 방지
export const maxDuration = 60;

/**
 * 독서 궁합 분석 API
 *
 * 학습 포인트:
 * - 두 사용자의 완독 목록을 AI로 비교 분석
 * - 캐싱 우선: 같은 쌍의 기존 결과가 있으면 재분석하지 않는다 (force로 재분석)
 * - 상대방 책 목록은 RLS가 is_public=true만 돌려주므로 별도 필터 불필요
 * - 추천 도서는 AI 응답의 제목을 실제 book 레코드와 매칭해 표지·ISBN을 확보
 *
 * POST /api/compatibility/analyze
 * Body: { targetUserId: string, force?: boolean }
 */
export async function POST(request: NextRequest) {
  // 예약된 usage 행 id — OpenAI 요청 전 실패 시에만 환불(삭제)한다.
  let reservedUsageId: string | null = null;
  // OpenAI 요청을 시작하면 비용이 발생할 수 있으므로 이후 실패는 환불하지 않는다.
  let aiRequestStarted = false;

  try {
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

    // 2. 요청 검증
    const body: unknown = await request.json().catch(() => null);
    const targetUserId =
      body && typeof body === 'object' && 'targetUserId' in body
        ? String((body as { targetUserId: unknown }).targetUserId)
        : null;
    const force =
      body && typeof body === 'object' && 'force' in body
        ? Boolean((body as { force: unknown }).force)
        : false;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId가 필요합니다.' },
        { status: 400 }
      );
    }
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: '자기 자신과는 궁합을 볼 수 없습니다.' },
        { status: 400 }
      );
    }

    // 3. 쌍 정렬 — DB 제약(user_id_1 < user_id_2)과 동일한 순서로 저장/조회
    const [userId1, userId2] =
      user.id < targetUserId
        ? [user.id, targetUserId]
        : [targetUserId, user.id];

    // 4. 캐시 확인 — 같은 쌍의 기존 분석이 있으면 그대로 사용
    if (!force) {
      const { data: cached } = await supabase
        .from('compatibility_analyses')
        .select('id')
        .eq('user_id_1', userId1)
        .eq('user_id_2', userId2)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return NextResponse.json({
          success: true,
          analysis_id: cached.id,
          cached: true,
        });
      }
    }

    // 5. 두 사용자의 완독 목록 조회 (병렬)
    //    상대방 책은 RLS가 공개(is_public) 책만 반환한다
    const fetchCompletedBooks = (userId: string) =>
      supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('rating', 'is', null)
        .order('completed_date', { ascending: false });

    const [{ data: books1 }, { data: books2 }, { data: profiles }] =
      await Promise.all([
        fetchCompletedBooks(userId1),
        fetchCompletedBooks(userId2),
        supabase
          .from('profiles')
          .select('id, nickname, username')
          .in('id', [userId1, userId2]),
      ]);

    const MIN_BOOKS = 5;
    const myBooks = user.id === userId1 ? books1 : books2;
    const targetBooks = user.id === userId1 ? books2 : books1;

    if (!myBooks || myBooks.length < MIN_BOOKS) {
      return NextResponse.json(
        {
          error: `궁합 분석을 위해 내 완독 책(별점 포함)이 ${MIN_BOOKS}권 이상 필요합니다.`,
        },
        { status: 400 }
      );
    }
    if (!targetBooks || targetBooks.length < MIN_BOOKS) {
      return NextResponse.json(
        {
          error: `상대방의 공개된 완독 책(별점 포함)이 ${MIN_BOOKS}권 이상일 때 분석할 수 있습니다.`,
        },
        { status: 400 }
      );
    }

    // 이번 달 슬롯을 원자적으로 예약한다 (OpenAI 호출 전). 동시 요청 초과 호출 차단.
    // 캐시 히트는 이 지점보다 앞에서 이미 응답을 반환하므로 예약도 하지 않는다.
    const reservation = await reserveUsage(supabase, 'compatibility');
    if (!reservation.allowed) {
      return NextResponse.json(
        { error: USAGE_LIMIT_EXCEEDED_ERROR },
        { status: 429 }
      );
    }
    reservedUsageId = reservation.usageId;

    const getName = (userId: string) => {
      const profile = profiles?.find((p) => p.id === userId);
      return profile?.nickname || profile?.username || '독서가';
    };

    // 6. AI 분석 실행 — 토큰 절약을 위해 최근 30권까지만 전달
    const MAX_BOOKS_FOR_PROMPT = 30;
    const toPromptBooks = (books: Book[]) =>
      books.slice(0, MAX_BOOKS_FOR_PROMPT).map((book) => ({
        title: book.title,
        author: book.author,
        category: book.category,
        rating: book.rating,
      }));

    const prompt = createCompatibilityPrompt({
      user1: { name: getName(userId1), books: toPromptBooks(books1 as Book[]) },
      user2: { name: getName(userId2), books: toPromptBooks(books2 as Book[]) },
    });

    aiRequestStarted = true;
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '당신은 독서 궁합 분석 전문가입니다. JSON 형식으로 응답하세요.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('AI 응답이 없습니다.');
    }

    const aiResponse = JSON.parse(responseText);

    // 7. 점수 정규화 + 타입은 점수 구간으로 서버가 결정 (AI 드리프트 방지)
    const score = Math.max(
      0,
      Math.min(100, Math.round(Number(aiResponse.compatibility_score) || 0))
    );
    const typeBand = getCompatibilityTypeByScore(score);

    // 8. 분석 결과 저장
    const { data: analysis, error: analysisError } = await supabase
      .from('compatibility_analyses')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        compatibility_score: score,
        compatibility_type: typeBand.name,
        compatibility_description: aiResponse.compatibility_description,
        similarity_analysis: aiResponse.similarity_analysis,
        analyzed_books_count_1: Math.min(books1!.length, MAX_BOOKS_FOR_PROMPT),
        analyzed_books_count_2: Math.min(books2!.length, MAX_BOOKS_FOR_PROMPT),
        analysis_model: AI_MODEL,
        cost_in_cents: calculateCost(
          completion.usage?.prompt_tokens || 0,
          completion.usage?.completion_tokens || 0
        ),
      })
      .select()
      .single();

    if (analysisError) {
      console.error('궁합 분석 저장 실패:', analysisError);
      return NextResponse.json(
        { error: '분석 결과를 저장할 수 없습니다.' },
        { status: 500 }
      );
    }

    // 9. 상호 추천 도서 저장 — AI가 고른 제목을 실제 책 레코드와 매칭
    const recommendations = [
      // user1이 받는 추천 = user2의 책장에서 고른 책
      ...mapRecommendations(
        aiResponse.recommendations_for_user1,
        books2 as Book[],
        { fromUserId: userId2, toUserId: userId1, analysisId: analysis.id }
      ),
      ...mapRecommendations(
        aiResponse.recommendations_for_user2,
        books1 as Book[],
        { fromUserId: userId1, toUserId: userId2, analysisId: analysis.id }
      ),
    ];

    if (recommendations.length > 0) {
      const { error: recError } = await supabase
        .from('mutual_recommendations')
        .insert(recommendations);

      if (recError) {
        // 추천 저장 실패는 분석 자체를 무효화하지 않는다 — 로그만 남긴다
        console.error('상호 추천 저장 실패:', recError);
      }
    }

    return NextResponse.json({
      success: true,
      analysis_id: analysis.id,
      cached: false,
    });
  } catch (error) {
    console.error('궁합 분석 실패:', error);
    return NextResponse.json(
      { error: '궁합 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    // 슬롯 예약 후 OpenAI 요청을 시작하기 전에 실패한 경우에만 환불한다.
    // 요청을 시작한 뒤에는 비용이 발생했을 수 있으므로 실패해도 사용량을 유지한다.
    // 환불 정리가 응답을 깨뜨리지 않도록 자체 try로 감싼다.
    if (!aiRequestStarted && reservedUsageId) {
      try {
        await refundUsage(createAdminClient(), reservedUsageId);
      } catch (refundError) {
        console.error('AI 사용량 환불 처리 실패:', refundError);
      }
    }
  }
}

type AiRecommendation = {
  title?: unknown;
  author?: unknown;
  reason?: unknown;
};

/**
 * AI 추천(제목/저자/이유)을 mutual_recommendations insert 행으로 변환
 * 제목을 원본 책 목록과 매칭해 표지·ISBN·출판사를 확보한다
 */
function mapRecommendations(
  aiRecs: unknown,
  sourceBooks: Book[],
  ids: { fromUserId: string; toUserId: string; analysisId: string }
) {
  if (!Array.isArray(aiRecs)) return [];

  // 공백·문장부호를 제거한 소문자 비교로 표기 흔들림을 흡수
  const normalize = (title: string) =>
    title.toLowerCase().replace(/[\s\-–—:·,."'“”‘’()[\]]/g, '');

  return aiRecs
    .filter(
      (rec): rec is AiRecommendation & { title: string; reason: string } =>
        typeof (rec as AiRecommendation).title === 'string' &&
        typeof (rec as AiRecommendation).reason === 'string'
    )
    .slice(0, 3)
    .map((rec, idx) => {
      const matched = sourceBooks.find(
        (book) =>
          normalize(book.title) === normalize(rec.title) ||
          normalize(book.title).includes(normalize(rec.title)) ||
          normalize(rec.title).includes(normalize(book.title))
      );

      return {
        compatibility_analysis_id: ids.analysisId,
        from_user_id: ids.fromUserId,
        to_user_id: ids.toUserId,
        isbn: matched?.isbn ?? null,
        title: matched?.title ?? rec.title,
        author:
          matched?.author ??
          (typeof rec.author === 'string' ? rec.author : null),
        publisher: matched?.publisher ?? null,
        cover_image: matched?.cover_image ?? null,
        category: matched?.category ?? null,
        reason: rec.reason,
        display_order: idx + 1,
      };
    });
}

/**
 * 토큰 사용량 기반 비용 계산 (센트 단위) — taste-analysis와 동일 기준
 * gpt-4o 단가: 입력 $2.50 / 100만 토큰, 출력 $10.00 / 100만 토큰
 */
function calculateCost(promptTokens: number, completionTokens: number): number {
  const inputCostPerToken = 2.5 / 1_000_000;
  const outputCostPerToken = 10.0 / 1_000_000;
  const cost =
    promptTokens * inputCostPerToken + completionTokens * outputCostPerToken;
  return Math.ceil(cost * 100);
}
