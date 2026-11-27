import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { checkUsageLimit } from '@/shared/lib/aiUsage';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { buildShareMetadata } from '@/shared/lib/seo/shareMetadata';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

import {
  CompatibilityGuest,
  CompatibilityView,
} from '@/features/compatibility';

import type { MutualRecommendation } from '@/entities/compatibility/types';
import type { Metadata } from 'next';

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
  const user = await getCurrentUser();

  // 2. 상대방 프로필 조회
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  // 비로그인은 안내 화면 — 예전엔 /login 으로 바로 보냈는데, 미리보기 봇도 비로그인이라
  // 링크 미리보기가 로그인 화면(홈 문구)으로 나갔다(2026-11-27). 로그인 버튼이 이 주소를
  // redirect 로 남겨, 가입을 마치면 케미를 보러 온 맥락으로 돌아온다.
  if (!user) {
    return (
      <CompatibilityGuest
        targetName={toDisplayName(profile)}
        username={username}
      />
    );
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

  const [
    { data: analysis },
    { count: myBooksCount },
    { count: targetBooksCount },
    { remaining: compatibilityRemaining },
  ] = await Promise.all([
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
    checkUsageLimit(supabase, user.id, 'compatibility'),
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
      compatibilityRemaining={compatibilityRemaining}
    />
  );
};

export default CompatibilityPage;

/**
 * 링크 미리보기 — 케미 결과의 공유 버튼이 이 주소를 보낸다.
 * openGraph 를 안 적으면 루트(홈) 문구가 실린다. 그림은 같은 폴더 opengraph-image.tsx.
 * 쿠키를 읽지 않는 조회라 받는 사람·봇 모두에게 같은 제목이 나간다.
 */
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  const name = profile ? toDisplayName(profile) : username;
  const title = `${name}님과 나의 독서 케미 | page0127.`;
  const description = `${name}님과 내 책장을 나란히 놓고, 겹치는 관심사와 서로 다른 결, 서로에게 건네줄 책을 찾아 드려요.`;

  return {
    title,
    description,
    // 사람마다 결과가 다른 화면이라 검색에는 올리지 않는다
    robots: { index: false, follow: true },
    ...buildShareMetadata({
      path: `/${username}/compatibility`,
      title,
      description,
    }),
  };
};
