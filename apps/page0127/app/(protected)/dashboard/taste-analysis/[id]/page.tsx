import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';
import { groupRecommendationsByType } from '@/entities/taste-analysis/model/recommendations';

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

  const user = await getCurrentUser();

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

  // 성향 이력 — 상세 화면의 '취향의 변화' (서재 머리 카드에서 옮겨 왔다)
  const { data: history } = await supabase
    .from('taste_analyses')
    .select('id, personality_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 타입별로 그룹화 (노출 상한까지만)
  const groupedRecommendations = groupRecommendationsByType(recommendations);

  const analysisWithRecommendations = {
    ...analysis,
    recommendations: groupedRecommendations,
  };

  return (
    <TasteAnalysisResult
      analysis={analysisWithRecommendations}
      username={profile.username}
      history={history ?? []}
    />
  );
};

export default TasteAnalysisDetailPage;
