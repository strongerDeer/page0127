import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/shared/lib/supabase/server';

/**
 * 최신 독서 취향 분석 결과 조회 API
 *
 * 학습 포인트:
 * - 캐시된 분석 결과 조회
 * - 추천 도서 함께 조회 (JOIN)
 *
 * GET /api/taste-analysis/latest
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 2. 최신 분석 결과 조회
    const { data: analysis, error: analysisError } = await supabase
      .from('taste_analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (analysisError) {
      if (analysisError.code === 'PGRST116') {
        // 분석 결과가 없음
        return NextResponse.json({ analysis: null });
      }
      console.error('분석 결과 조회 실패:', analysisError);
      return NextResponse.json({ error: '분석 결과를 불러올 수 없습니다.' }, { status: 500 });
    }

    // 3. 추천 도서 조회
    const { data: recommendations, error: recError } = await supabase
      .from('book_recommendations')
      .select('*')
      .eq('taste_analysis_id', analysis.id)
      .order('recommendation_type')
      .order('display_order');

    if (recError) {
      console.error('추천 도서 조회 실패:', recError);
      return NextResponse.json({ error: '추천 도서를 불러올 수 없습니다.' }, { status: 500 });
    }

    // 4. 타입별로 그룹화
    const groupedRecommendations = {
      match: recommendations?.filter((r) => r.recommendation_type === 'match') || [],
      expand: recommendations?.filter((r) => r.recommendation_type === 'expand') || [],
      challenge: recommendations?.filter((r) => r.recommendation_type === 'challenge') || [],
    };

    // 5. 성공 응답
    return NextResponse.json({
      analysis: {
        ...analysis,
        recommendations: groupedRecommendations,
      },
    });
  } catch (error) {
    console.error('분석 결과 조회 실패:', error);
    return NextResponse.json(
      { error: '분석 결과 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
