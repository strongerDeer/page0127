'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';
import { followBroadcast } from '@/shared/lib/broadcastChannel';

import { getPastSelfHistory } from '@/entities/book';
import { getSeoulToday } from '@/entities/book/model/libraryPeriod';
import {
  followKeys,
  getFollowingLeague,
  getReadingSocial,
} from '@/entities/follow';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { FollowToCompareButton } from '@/features/follow/ui/FollowToCompareButton';
import { NudgeButton } from '@/features/reading-nudge';
import { TasteClashCard } from '@/features/taste-clash';
import { RecommendedReaders } from '@/features/user/ui/RecommendedReaders';

import { PastSelfBattle } from './PastSelfBattle';
import { ReadingBattleFlow } from './ReadingBattleFlow';
import { ReadingLeague } from './ReadingLeague';
import {
  ReadingLeagueError,
  ReadingLeagueLoading,
} from './ReadingLeagueStatus';

import type { PastSelfHistory } from '@/entities/book';
import type { FollowingLeague, ReadingSocial } from '@/entities/follow';
import type { RecommendedReaderCard } from '@/features/user/api/getRecommendedReaders';

export const LiveReadingLeague = ({
  currentUserId,
  initialData,
  initialSocial,
  initialHistory,
  recommendedReaders = [],
}: {
  currentUserId: string;
  initialData?: FollowingLeague;
  initialSocial?: ReadingSocial;
  initialHistory?: PastSelfHistory;
  recommendedReaders?: RecommendedReaderCard[];
}) => {
  const [transition, setTransition] = useState<{
    status: 'idle' | 'loading' | 'error';
    version: number;
  }>({ status: 'idle', version: 0 });
  const today = getSeoulToday();
  const { data, dataUpdatedAt, isPending, isError, isFetching, refetch } =
    useQuery({
      queryKey: followKeys.readingLeague(currentUserId),
      queryFn: () => getFollowingLeague(createClient(), currentUserId),
      initialData,
      staleTime: 0,
      // 서재를 수정하고 돌아왔을 때도 이전 서버 응답이 캐시에 고정되지 않게 한다.
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      retry: 1,
    });
  const social = useQuery({
    queryKey: followKeys.readingSocial(currentUserId),
    queryFn: () => getReadingSocial(createClient(), currentUserId),
    initialData: initialSocial,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: 1,
    enabled: Boolean(data && data.readers.length > 1),
  });
  const history = useQuery({
    queryKey: ['books', 'past-self', currentUserId, today],
    queryFn: () => getPastSelfHistory(createClient(), currentUserId, today),
    initialData: initialHistory?.asOf === today ? initialHistory : undefined,
    enabled: Boolean(data && data.readers.length === 1),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: 1,
  });
  const refetchSocial = social.refetch;
  useEffect(
    () =>
      followBroadcast.onFollowEvent(() => {
        void refetch();
        void refetchSocial();
      }),
    [refetch, refetchSocial]
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
  const genres = new Map(
    social.data?.year === data.year
      ? social.data.genres.map((g) => [g.userId, g.categories])
      : []
  );
  const readers = data.readers.map((reader) => ({
    ...reader,
    genres: genres.get(reader.userId),
  }));
  const clash =
    social.data?.clashes.find((item) => memberIds.has(item.otherUserId)) ??
    null;
  const mine = readers.find((reader) => reader.userId === currentUserId);
  const other = readers.find((reader) => reader.userId === clash?.otherUserId);
  const discovery = recommendedReaders
    .filter(
      (reader) =>
        !memberIds.has(reader.userId) &&
        reader.userId !== currentUserId &&
        reader.username
    )
    .slice(0, 2);
  const transitionStatus =
    dataUpdatedAt > transition.version ? 'idle' : transition.status;

  const handleFollowed = async () => {
    setTransition({ status: 'loading', version: dataUpdatedAt });
    try {
      // 이미 무효화로 시작된 집계 요청이 있으면 취소하지 않고 그 결과를 기다린다.
      const result = await refetch({ cancelRefetch: false });
      setTransition({
        status:
          result.error || !result.data || result.data.readers.length <= 1
            ? 'error'
            : 'idle',
        version: result.dataUpdatedAt,
      });
    } catch {
      setTransition({ status: 'error', version: dataUpdatedAt });
    }
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-4'>
        {isError && (readers.length > 1 || transitionStatus === 'idle') && (
          <ReadingLeagueError
            onRetry={() => {
              void refetch();
              if (readers.length === 1) void history.refetch();
            }}
            isRetrying={isFetching}
          />
        )}
        <ReadingBattleFlow
          key={readers.length > 1 ? 'following' : 'self'}
          hasFollowing={readers.length > 1}
          recommendations={discovery}
          transition={transitionStatus}
          onRetryFollowing={() => void handleFollowed()}
          renderFollow={(reader) => (
            <FollowToCompareButton
              userId={reader.userId}
              name={toDisplayName(reader)}
              onFollowed={handleFollowed}
            />
          )}
          renderSelf={(onDiscover) => (
            <>
              {history.isError && !isError && (
                <ReadingLeagueError
                  onRetry={() => void history.refetch()}
                  isRetrying={history.isFetching}
                />
              )}
              {history.data && mine ? (
                <PastSelfBattle
                  reader={mine}
                  history={history.data}
                  onDiscover={onDiscover}
                />
              ) : history.isPending ? (
                <ReadingLeagueLoading />
              ) : null}
              {history.isError && !history.data && (
                <button
                  type='button'
                  className='mt-3 text-sm font-medium text-primary'
                  onClick={onDiscover}
                >
                  다른 리더와 비교하기
                </button>
              )}
            </>
          )}
          following={
            <ReadingLeague
              currentUserId={currentUserId}
              year={data.year}
              readers={readers}
              actions={(recipient, self, appearance = 'icon') => (
                <>
                  <NudgeButton
                    iconOnly={appearance === 'icon'}
                    key={recipient.userId}
                    currentUserId={currentUserId}
                    recipientId={recipient.userId}
                    recipientName={toDisplayName(recipient)}
                    context={
                      self.value === recipient.value
                        ? 'tied'
                        : self.value > recipient.value
                          ? 'ahead'
                          : 'behind'
                    }
                  />
                </>
              )}
              discovery={
                discovery.length > 0 ? (
                  <RecommendedReaders readers={discovery} />
                ) : undefined
              }
            />
          }
        />
        {readers.length > 1 &&
          (social.isPending ? (
            <p role='status' className='text-sm text-text-subtle'>
              장르와 취향을 비교하고 있어요.
            </p>
          ) : social.isError ? (
            <div role='alert' className='text-sm text-text-subtle'>
              장르·취향을 불러오지 못했어요.{' '}
              <button
                type='button'
                className='text-primary underline'
                onClick={() => void social.refetch()}
              >
                다시 시도
              </button>
            </div>
          ) : (
            <TasteClashCard
              clash={clash}
              otherName={other ? toDisplayName(other) : undefined}
              mineUsername={mine?.username}
              otherUsername={other?.username}
            />
          ))}
      </div>
    </div>
  );
};
