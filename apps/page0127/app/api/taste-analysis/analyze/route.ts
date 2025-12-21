import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/lib/supabase/server';
import { openai, AI_MODEL, MAX_TOKENS, TEMPERATURE } from '@/shared/lib/openai';
import { createTasteAnalysisPrompt } from '@/shared/lib/openai/prompts/taste-analysis';
import type { Book } from '@/entities/book/types';
import type { CreateTasteAnalysisDto } from '@/entities/taste-analysis/types';

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
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 2. 완독한 책 목록 조회 (최소 5권 필요)
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('rating', 'is', null) // 별점이 있는 책만
      .order('completed_date', { ascending: false });

    if (booksError) {
      console.error('책 목록 조회 실패:', booksError);
      return NextResponse.json({ error: '책 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    if (!books || books.length < 5) {
      return NextResponse.json(
        { error: '분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.' },
        { status: 400 }
      );
    }

    // 3. AI 분석 실행
    const prompt = createTasteAnalysisPrompt(books as Book[]);

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '당신은 독서 취향 분석 전문가입니다. JSON 형식으로 응답하세요.',
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
        cost_in_cents: calculateCost(completion.usage?.total_tokens || 0),
      })
      .select()
      .single();

    if (analysisError) {
      console.error('분석 결과 저장 실패:', analysisError);
      return NextResponse.json({ error: '분석 결과를 저장할 수 없습니다.' }, { status: 500 });
    }

    // 6. 추천 도서 저장
    const recommendations = aiResponse.recommendations.map((rec: any) => ({
      taste_analysis_id: analysis.id,
      recommendation_type: rec.type,
      isbn: rec.isbn,
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
      // 추천 도서 저장 실패는 치명적이지 않으므로 경고만 출력
    }

    // 7. 성공 응답
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
 * GPT-4o-mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens
 */
function calculateCost(totalTokens: number): number {
  // 간단하게 평균 $0.30 / 1M tokens로 계산
  const costPerToken = 0.30 / 1_000_000;
  return Math.ceil(totalTokens * costPerToken * 100); // 센트 단위
}
