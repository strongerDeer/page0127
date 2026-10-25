'use client';

import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';
import { followBroadcast } from '@/shared/lib/broadcastChannel';

import { followKeys, getFollowingLeague } from '@/entities/follow';

import { RecommendedReaders } from '@/features/user/ui/RecommendedReaders';

import { ReadingLeague } from './ReadingLeague';
import {
  ReadingLeagueError,
  ReadingLeagueLoading,
} from './ReadingLeagueStatus';

import type { FollowingLeague } from '@/entities/follow';
import type { RecommendedReaderCard } from '@/features/user/api/getRecommendedReaders';

export const LiveReadingLeague = ({
  currentUserId,
  initialData,
  recommendedReaders = [],
}: {
  currentUserId: string;
  initialData?: FollowingLeague;
  recommendedReaders?: RecommendedReaderCard[];
}) => {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: followKeys.readingLeague(currentUserId),
    queryFn: () => getFollowingLeague(createClient(), currentUserId),
    initialData,
    staleTime: 0,
    // 서재를 수정하고 돌아왔을 때도 이전 서버 응답이 캐시에 고정되지 않게 한다.
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: 1,
  });
  useEffect(
    () =>
      followBroadcast.onFollowEvent(() => {
        void refetch();
      }),
    [refetch]
  );

  if (isPending) return <ReadingLeagueLoading />;
  if (!data)
    return (
      <ReadingLeagueError
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );

  const memberIds = new Set(data.readers.map((reader) => reader.userId));
  const discovery = recommendedReaders
    .filter(
      (reader) =>
        !memberIds.has(reader.userId) &&
        reader.userId !== currentUserId &&
        reader.username
    )
    .slice(0, 2);

  return (
    <div className='space-y-4'>
      {isError && (
        <ReadingLeagueError
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      )}
      <ReadingLeague
        currentUserId={currentUserId}
        year={data.year}
        readers={data.readers}
        discovery={
          discovery.length > 0 ? (
            <RecommendedReaders readers={discovery} />
          ) : undefined
        }
      />
    </div>
  );
};
