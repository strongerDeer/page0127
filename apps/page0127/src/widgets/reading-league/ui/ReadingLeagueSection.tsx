import { createClient } from '@/shared/config/supabase/server';

import { getPastSelfHistory } from '@/entities/book';
import { getFollowingLeague, getReadingSocial } from '@/entities/follow';

import { getRecommendedReaders } from '@/features/user/api/getRecommendedReaders';

import { LiveReadingLeague } from './LiveReadingLeague';

import type { PastSelfHistory } from '@/entities/book';
import type { FollowingLeague, ReadingSocial } from '@/entities/follow';

export const ReadingLeagueSection = async ({
  currentUserId,
}: {
  currentUserId: string;
}) => {
  let initialData: FollowingLeague | undefined;
  let initialSocial: ReadingSocial | undefined;
  let initialHistory: PastSelfHistory | undefined;
  try {
    initialData = await getFollowingLeague(await createClient(), currentUserId);
  } catch {
    // DB 반영 전이나 일시 장애에도 활동 피드는 남기고, 브라우저에서 재시도한다.
    console.warn(
      '[reading-league] 집계 조회 실패. 마이그레이션 반영 여부와 DB 연결을 확인해 주세요.'
    );
  }
  if (initialData && initialData.readers.length > 1) {
    try {
      initialSocial = await getReadingSocial(
        await createClient(),
        currentUserId
      );
    } catch {
      console.warn('[reading-social] 장르·취향 집계 조회 실패');
    }
  } else if (initialData?.readers.length === 1) {
    try {
      initialHistory = await getPastSelfHistory(
        await createClient(),
        currentUserId
      );
    } catch {
      console.warn('[past-self] 지난 독서 기록 조회 실패');
    }
  }
  const recommendedReaders =
    initialData && initialData.readers.length <= 3
      ? await getRecommendedReaders(currentUserId)
      : [];
  return (
    <LiveReadingLeague
      currentUserId={currentUserId}
      initialData={initialData}
      initialSocial={initialSocial}
      initialHistory={initialHistory}
      recommendedReaders={recommendedReaders}
    />
  );
};
