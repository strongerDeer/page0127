'use client';

import { useEffect, useId, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';
import { followBroadcast } from '@/shared/lib/broadcastChannel';

import {
  followKeys,
  getFollowingLeague,
  getReadingSocial,
} from '@/entities/follow';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { NudgeButton } from '@/features/reading-nudge';
import { TasteClashCard } from '@/features/taste-clash';
import { RecommendedReaders } from '@/features/user/ui/RecommendedReaders';

import { ReadingLeague } from './ReadingLeague';
import {
  ReadingLeagueError,
  ReadingLeagueLoading,
} from './ReadingLeagueStatus';

import type { FollowingLeague, ReadingSocial } from '@/entities/follow';
import type { RecommendedReaderCard } from '@/features/user/api/getRecommendedReaders';

export const LiveReadingLeague = ({
  currentUserId,
  initialData,
  initialSocial,
  recommendedReaders = [],
}: {
  currentUserId: string;
  initialData?: FollowingLeague;
  initialSocial?: ReadingSocial;
  recommendedReaders?: RecommendedReaderCard[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
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
  const social = useQuery({
    queryKey: followKeys.readingSocial(currentUserId),
    queryFn: () => getReadingSocial(createClient(), currentUserId),
    initialData: initialSocial,
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

  return (
    <div className='space-y-4'>
      <button
        type='button'
        className='flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 text-left lg:hidden'
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          <strong className='block text-sm'>올해의 독서 배틀</strong>
          <span className='mt-1 block text-xs text-text-subtle'>
            나 {mine?.completedBooks ?? 0}권 · 팔로잉 {readers.length - 1}명
          </span>
        </span>
        <span className='text-sm text-primary'>
          {expanded ? '접기' : '펼쳐 보기'}
        </span>
      </button>
      <div
        id={contentId}
        className={`${expanded ? 'block' : 'hidden'} space-y-4 lg:block`}
      >
        {isError && (
          <ReadingLeagueError
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        )}
        <ReadingLeague
          currentUserId={currentUserId}
          year={data.year}
          readers={readers}
          actions={(recipient, self) => (
            <>
              <NudgeButton
                iconOnly
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
        {social.isPending ? (
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
        )}
      </div>
    </div>
  );
};
