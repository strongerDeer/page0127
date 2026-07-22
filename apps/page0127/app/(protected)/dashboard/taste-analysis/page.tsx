import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

import { TasteAnalysisResult } from '@/features/taste-analysis/ui/TasteAnalysisResult';

/**
 * AI 독서 취향 분석 결과 페이지 (Server Component)
 *
 * 학습 포인트:
 * - 최신 분석 결과 조회
 * - 분석 결과가 없으면 대시보드로 리다이렉트
 */
const TasteAnalysisPage = async () => {
  const supabase = await createClient();

  // 현재 로그인한 사용자 정보 조회
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(user.id);
  if (!profile?.username) {
    redirect('/login');
  }

  // 최신 분석 결과 조회
  const { data: analysis, error: analysisError } = await supabase
    .from('taste_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (analysisError || !analysis) {
    redirect(`/${profile.username}`);
  }

  // 추천 도서 조회
  const { data: recommendations } = await supabase
    .from('book_recommendations')
    .select('*')
    .eq('taste_analysis_id', analysis.id)
    .order('recommendation_type')
    .order('display_order');

  // 타입별로 그룹화 (표지가 있는 책만 필터링)
  const groupedRecommendations = {
    match:
      recommendations?.filter(
        (r) => r.recommendation_type === 'match' && r.cover_image !== null
      ) || [],
    expand:
      recommendations?.filter(
        (r) => r.recommendation_type === 'expand' && r.cover_image !== null
      ) || [],
    challenge:
      recommendations?.filter(
        (r) => r.recommendation_type === 'challenge' && r.cover_image !== null
      ) || [],
  };

  const analysisWithRecommendations = {
    ...analysis,
    recommendations: groupedRecommendations,
  };

  return (
    <TasteAnalysisResult
      analysis={analysisWithRecommendations}
      username={profile.username}
    />
  );
};

export default TasteAnalysisPage;
