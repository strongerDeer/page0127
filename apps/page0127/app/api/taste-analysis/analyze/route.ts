import { after, NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';
import { upgradeImageResolution } from '@/shared/lib/imageUtils';
import { AI_MODEL, MAX_TOKENS, openai, TEMPERATURE } from '@/shared/lib/openai';
import { createTasteAnalysisPrompt } from '@/shared/lib/openai/prompts/taste-analysis';

import { READING_PERSONALITY_TYPES } from '@/entities/taste-analysis/model/personalityTypes';

import type { Book } from '@/entities/book';
import type { SupabaseClient } from '@supabase/supabase-js';

// gpt-4o + max_tokens 4000 응답은 경우에 따라 수십 초가 걸릴 수 있어
// 배포 플랫폼 기본 함수 타임아웃(짧으면 10초)에 걸려 강제 종료되는 것을 방지
export const maxDuration = 60;

/**
 * 독서 취향 분석 API
 *
 * 학습 포인트:
 * - OpenAI API를 사용한 AI 분석
 * - 완독한 책 목록을 기반으로 분석
 * - 분석 결과를 DB에 저장 (캐싱)
 *
 * POST /api/taste-analysis/analyze
 */
export async function POST(_request: NextRequest) {
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

    // 2. 완독한 책 목록 조회 (최소 5권 필요)
    //    최신순 정렬 후 최근 N권까지만 프롬프트에 사용 — 응답 속도·비용 관리
    const MAX_BOOKS_FOR_PROMPT = 100;
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('rating', 'is', null) // 별점이 있는 책만
      .order('completed_date', { ascending: false })
      .limit(MAX_BOOKS_FOR_PROMPT);

    if (booksError) {
      console.error('책 목록 조회 실패:', booksError);
      return NextResponse.json(
        { error: '책 목록을 불러올 수 없습니다.' },
        { status: 500 }
      );
    }

    if (!books || books.length < 5) {
      return NextResponse.json(
        { error: '분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 3. AI 분석 실행 — 성향 타입은 고정 카탈로그에서 고르게 한다
    const prompt = createTasteAnalysisPrompt(
      books as Book[],
      READING_PERSONALITY_TYPES
    );

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '당신은 독서 취향 분석 전문가입니다. JSON 형식으로 응답하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' }, // JSON 모드
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('AI 응답이 없습니다.');
    }

    // 4. AI 응답 파싱
    const aiResponse = JSON.parse(responseText);

    // 성향 타입 검증 — 카탈로그에 없는 타입이 와도 저장은 하되, 프롬프트 개선 신호로 남긴다
    const isKnownType = READING_PERSONALITY_TYPES.some(
      (t) => t.name === aiResponse.personality_type
    );
    if (!isKnownType) {
      console.warn(
        `카탈로그에 없는 성향 타입 응답: "${aiResponse.personality_type}"`
      );
    }

    // AI 응답 검증 및 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.warn('AI 응답 구조:', {
        personality_type: aiResponse.personality_type,
        has_preference_profile: !!aiResponse.preference_profile,
        recommendations_count: aiResponse.recommendations?.length || 0,
      });
      console.warn('AI 전체 응답:', JSON.stringify(aiResponse, null, 2));
    }

    // 5. 분석 결과 저장
    const { data: analysis, error: analysisError } = await supabase
      .from('taste_analyses')
      .insert({
        user_id: user.id,
        personality_type: aiResponse.personality_type,
        personality_description: aiResponse.personality_description,
        preference_profile: aiResponse.preference_profile,
        analyzed_books_count: books.length,
        analysis_model: AI_MODEL,
        cost_in_cents: calculateCost(
          completion.usage?.prompt_tokens || 0,
          completion.usage?.completion_tokens || 0
        ),
      })
      .select()
      .single();

    if (analysisError) {
      console.error('분석 결과 저장 실패:', analysisError);
      return NextResponse.json(
        { error: '분석 결과를 저장할 수 없습니다.' },
        { status: 500 }
      );
    }

    // 6. 추천 도서 저장
    if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
      const recommendations = aiResponse.recommendations.map(
        (rec: {
          type: string;
          title: string;
          author?: string;
          reason: string;
          display_order: number;
        }) => ({
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
        })
      );

      const { error: recError } = await supabase
        .from('book_recommendations')
        .insert(recommendations);

      if (recError) {
        console.error('추천 도서 저장 실패:', recError);
        console.error('추천 도서 데이터:', recommendations);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`추천 도서 ${recommendations.length}건 저장 완료`);
        }

        // 7. 알라딘 API로 표지 이미지 업데이트
        // after()로 감싸서 응답을 먼저 보낸 뒤 백그라운드에서 처리한다.
        // 추천 도서 수만큼 알라딘 API를 순차 호출(rate limit 방지용 딜레이 포함)하기 때문에
        // 응답 전에 기다리면 사용자 체감 대기 시간이 그만큼 늘어난다.
        after(async () => {
          try {
            await enrichRecommendationsWithAladinData(
              supabase,
              aiResponse.recommendations,
              analysis.id
            );
            if (process.env.NODE_ENV === 'development') {
              console.warn('알라딘 API 업데이트 완료');
            }
          } catch (err: unknown) {
            console.error('알라딘 API 업데이트 실패:', err);
          }
        });
      }
    } else {
      console.warn('AI 응답에 추천 도서가 없습니다.');
    }

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      analysis_id: analysis.id,
      message: '취향 분석이 완료되었습니다!',
    });
  } catch (error) {
    console.error('취향 분석 실패:', error);
    return NextResponse.json(
      { error: '취향 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 토큰 사용량 기반 비용 계산 (센트 단위)
 * GPT-4o: $2.50 / 1M input tokens, $10.00 / 1M output tokens
 */
function calculateCost(promptTokens: number, completionTokens: number): number {
  // gpt-4o 단가: 입력 $2.50 / 100만 토큰, 출력 $10.00 / 100만 토큰
  // 입력·출력 단가가 4배 차이 나서 total_tokens 하나로 뭉뚱그리면 오차가 큼 → 분리 계산
  const inputCostPerToken = 2.5 / 1_000_000;
  const outputCostPerToken = 10.0 / 1_000_000;
  const cost =
    promptTokens * inputCostPerToken + completionTokens * outputCostPerToken;
  return Math.ceil(cost * 100); // 센트 단위
}

/**
 * 알라딘 API로 추천 도서 정보 보강 (표지, ISBN, 출판사)
 *
 * 학습 포인트:
 * - 제목+저자로 알라딘 API 검색
 * - 검색 결과에서 책 정보 추출
 * - DB 업데이트 (표지, ISBN, 출판사)
 */
async function enrichRecommendationsWithAladinData(
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
  // 서버 전용 환경변수 — NEXT_PUBLIC_ 접두사를 붙이면 키가 클라이언트 번들에 인라인된다
  const ALADIN_API_KEY = process.env.ALADIN_API_KEY;
  const ALADIN_API_BASE_URL =
    'https://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

  if (!ALADIN_API_KEY) {
    console.error(
      'ALADIN_API_KEY 환경변수가 설정되지 않아 추천 도서 보강을 건너뜁니다.'
    );
    return;
  }

  for (const rec of recommendations) {
    try {
      // 제목으로 알라딘 API 검색
      const params = new URLSearchParams({
        ttbkey: ALADIN_API_KEY,
        Query: rec.title,
        QueryType: 'Title',
        MaxResults: '3',
        start: '1',
        SearchTarget: 'Book',
        output: 'js',
        Version: '20131101',
        // 기본값은 저해상도 썸네일 — Big으로 지정해야 큰 사이즈 표지를 받는다
        Cover: 'Big',
      });

      const url = `${ALADIN_API_BASE_URL}?${params.toString()}`;
      // 같은 추천 키워드로 알라딘 검색 시 24시간 동안 캐시 재사용
      const response = await fetch(url, {
        next: { revalidate: 86400 },
      });

      if (!response.ok) {
        console.error(`알라딘 API 실패 (${rec.title}):`, response.status);
        continue;
      }

      const data = await response.json();

      // 검색 결과에서 첫 번째 책 사용 (제목이 가장 유사)
      const matchedBook = data.item?.[0];

      if (matchedBook) {
        // DB 업데이트 (알라딘 정보로 덮어쓰기)
        const { error: updateError } = await supabase
          .from('book_recommendations')
          .update({
            isbn: matchedBook.isbn13 || matchedBook.isbn,
            title: matchedBook.title, // 알라딘 제목으로 덮어쓰기
            author: matchedBook.author, // 알라딘 저자로 덮어쓰기
            cover_image: matchedBook.cover
              ? upgradeImageResolution(matchedBook.cover)
              : null,
            publisher: matchedBook.publisher,
            category: matchedBook.categoryName,
          })
          .eq('taste_analysis_id', tasteAnalysisId)
          .eq('title', rec.title)
          .eq('recommendation_type', rec.type)
          .eq('display_order', rec.display_order);

        if (updateError) {
          console.error(`DB 업데이트 실패 (${rec.title}):`, updateError);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(
            `✅ ${matchedBook.title} (${matchedBook.author}) - 알라딘 정보 업데이트 완료`
          );
        }
      } else {
        // 알라딘에서 찾을 수 없는 책은 삭제
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
          console.warn(`❌ ${rec.title} - 알라딘에서 찾을 수 없어 삭제`);
        }
      }

      // API 요청 간 간격 (Rate Limiting 방지)
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`알라딘 API 오류 (${rec.title}):`, error);
    }
  }
}
