import { createClient } from '@/shared/config/supabase/server';

import { getFollowingLeague } from '@/entities/follow';

import { getRecommendedReaders } from '@/features/user/api/getRecommendedReaders';

import { LiveReadingLeague } from './LiveReadingLeague';

import type { FollowingLeague } from '@/entities/follow';

export const ReadingLeagueSection = async ({
  currentUserId,
}: {
  currentUserId: string;
}) => {
  let initialData: FollowingLeague | undefined;
  try {
    initialData = await getFollowingLeague(await createClient(), currentUserId);
  } catch {
    // DB 반영 전이나 일시 장애에도 활동 피드는 남기고, 브라우저에서 재시도한다.
    console.warn(
      '[reading-league] 집계 조회 실패. 마이그레이션 반영 여부와 DB 연결을 확인해 주세요.'
    );
  }
  const recommendedReaders =
    initialData && initialData.readers.length <= 3
      ? await getRecommendedReaders(currentUserId)
      : [];
  return (
    <LiveReadingLeague
      currentUserId={currentUserId}
      initialData={initialData}
      recommendedReaders={recommendedReaders}
    />
  );
};
