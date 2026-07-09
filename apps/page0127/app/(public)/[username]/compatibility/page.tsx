import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { CompatibilityView } from '@/features/compatibility';

import type { MutualRecommendation } from '@/entities/compatibility/types';

type PageProps = {
  params: Promise<{ username: string }>;
};

/**
 * 독서 궁합 페이지 (Server Component)
 *
 * 학습 포인트:
 * - 캐싱된 분석 결과를 서버에서 직접 조회 (별도 GET API 불필요)
 * - 분석 실행 후 클라이언트가 router.refresh()를 호출하면
 *   이 컴포넌트가 다시 실행되어 새 결과를 내려준다
 * - 상대방 책 권수는 RLS 덕분에 공개(is_public) 책만 집계된다
 */
const CompatibilityPage = async ({ params }: PageProps) => {
  const { username } = await params;
  const supabase = await createClient();

  // 1. 로그인 필수 — 궁합은 "나"와 상대의 비교이므로
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. 상대방 프로필 조회
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }
  if (profile.id === user.id) {
    // 자기 자신과의 궁합은 없다 — 본인 서재로 돌려보낸다
    redirect(`/${username}`);
  }

  // 3. 정렬된 쌍 (DB 제약 user_id_1 < user_id_2와 동일한 기준)
  const [userId1, userId2] =
    user.id < profile.id ? [user.id, profile.id] : [profile.id, user.id];
  const isCurrentUserFirst = user.id === userId1;

  // 4. 캐싱된 분석 + 양쪽 완독 권수 조회 (병렬)
  const countCompletedBooks = (userId: string) =>
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('rating', 'is', null);

  const [{ data: analysis }, { count: myBooksCount }, { count: targetBooksCount }] =
    await Promise.all([
      supabase
        .from('compatibility_analyses')
        .select('*')
        .eq('user_id_1', userId1)
        .eq('user_id_2', userId2)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      countCompletedBooks(user.id),
      countCompletedBooks(profile.id),
    ]);

  // 5. 상호 추천 도서 조회 (분석이 있을 때만)
  let recommendations: MutualRecommendation[] = [];
  if (analysis) {
    const { data } = await supabase
      .from('mutual_recommendations')
      .select('*')
      .eq('compatibility_analysis_id', analysis.id)
      .order('display_order');
    recommendations = data ?? [];
  }

  return (
    <CompatibilityView
      targetUserId={profile.id}
      targetName={profile.nickname || username}
      username={username}
      analysis={analysis}
      recommendationsForMe={recommendations.filter(
        (rec) => rec.to_user_id === user.id
      )}
      recommendationsForTarget={recommendations.filter(
        (rec) => rec.to_user_id === profile.id
      )}
      myBooksCount={myBooksCount ?? 0}
      targetBooksCount={targetBooksCount ?? 0}
      isCurrentUserFirst={isCurrentUserFirst}
    />
  );
};

export default CompatibilityPage;
