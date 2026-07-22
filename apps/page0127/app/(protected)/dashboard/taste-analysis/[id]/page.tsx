import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

import { TasteAnalysisResult } from '@/features/taste-analysis/ui/TasteAnalysisResult';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 과거 취향 분석 기록 상세 페이지 (Server Component)
 *
 * 학습 포인트:
 * - /dashboard/taste-analysis (최신 1건)와 달리 id로 특정 기록을 조회한다
 * - user_id까지 같이 필터링해서 다른 사람의 분석 결과를 못 보게 막는다 (RLS와 별개의 방어)
 */
const TasteAnalysisDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

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

  // 본인 소유의 분석 기록만 조회
  const { data: analysis, error: analysisError } = await supabase
    .from('taste_analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (analysisError || !analysis) {
    notFound();
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

export default TasteAnalysisDetailPage;
