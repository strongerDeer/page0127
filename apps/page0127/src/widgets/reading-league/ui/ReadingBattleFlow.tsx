'use client';
import { useState } from 'react';

import { Button } from '@repo/ui';

import { BattleReaderDiscovery } from './BattleReaderDiscovery';

import type { RecommendedReaderCard } from '@/features/user/api/getRecommendedReaders';
import type { ReactNode } from 'react';

/** 같은 자리를 유지하면서 과거의 나 → 추천 → 팔로잉 비교로 바꾼다. */
export const ReadingBattleFlow = ({
  hasFollowing,
  recommendations,
  renderSelf,
  following,
  renderFollow,
  transition = 'idle',
  onRetryFollowing,
}: {
  hasFollowing: boolean;
  recommendations: RecommendedReaderCard[];
  renderSelf: (onDiscover: () => void) => ReactNode;
  following: ReactNode;
  renderFollow: (reader: RecommendedReaderCard) => ReactNode;
  transition?: 'idle' | 'loading' | 'error';
  onRetryFollowing?: () => void;
}) => {
  const [discovering, setDiscovering] = useState(false);
  if (hasFollowing)
    return (
      <div>
        <p role='status' className='mb-3 text-xs text-text-subtle'>
          팔로잉과 올해 공개 완독 기록으로 비교해요.
        </p>
        {following}
      </div>
    );
  if (transition !== 'idle')
    return (
      <section
        className='rounded-xl border border-line bg-card p-5'
        aria-label='팔로우 후 올해 기록 조회'
      >
        <p
          role={transition === 'error' ? 'alert' : 'status'}
          className='text-sm leading-relaxed'
        >
          {transition === 'error'
            ? '팔로우는 완료됐어요. 올해 비교 기록을 불러오지 못했어요.'
            : '팔로우했어요. 올해 비교 기록을 불러오고 있어요.'}
        </p>
        {transition === 'error' && (
          <Button
            type='button'
            className='mt-3'
            variant='outline'
            onClick={onRetryFollowing}
          >
            올해 기록 다시 불러오기
          </Button>
        )}
      </section>
    );
  return (
    <>
      <div hidden={discovering}>{renderSelf(() => setDiscovering(true))}</div>
      {discovering && (
        <BattleReaderDiscovery
          readers={recommendations}
          onBack={() => setDiscovering(false)}
          renderFollow={renderFollow}
        />
      )}
    </>
  );
};
