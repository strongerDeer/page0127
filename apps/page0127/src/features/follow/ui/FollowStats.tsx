'use client';

import { useEffect, useEffectEvent } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users } from 'lucide-react';

import { followBroadcast } from '@/shared/lib/broadcastChannel';

import { followApi, followKeys } from '@/entities/follow';

/**
 * 팔로우 통계 표시 컴포넌트
 *
 * 학습 포인트:
 * - React Query로 통계 데이터 페칭
 * - BroadcastChannel로 다른 탭의 팔로우 이벤트 수신
 * - 실시간 통계 업데이트
 */
type FollowStatsProps = {
  userId: string;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
};

export const FollowStats = ({
  userId,
  onFollowersClick,
  onFollowingClick,
}: FollowStatsProps) => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: followKeys.stats(userId),
    queryFn: () => followApi.getFollowStats(userId),
  });

  // useEffectEvent: 구독 콜백을 effect 밖으로 분리한다.
  // 콜백은 항상 최신 queryClient를 보지만 deps에는 포함되지 않으므로,
  // eslint-disable 주석 없이도 빈 deps([])가 정당해진다 (마운트 시 1회만 구독).
  const handleFollowEvent = useEffectEvent(() => {
    // 모든 팔로우 관련 쿼리 무효화 (최신 데이터 가져오기)
    queryClient.invalidateQueries({ queryKey: followKeys.all });
  });

  // BroadcastChannel 이벤트 구독 (다른 탭에서 팔로우/언팔로우 시 자동 업데이트)
  useEffect(() => {
    const unsubscribe = followBroadcast.onFollowEvent(handleFollowEvent);
    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <div className='flex items-center gap-4 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
      </div>
    );
  }

  return (
    <div className='flex items-center gap-4 text-sm'>
      <button
        onClick={onFollowersClick}
        className='flex items-center gap-1 transition-colors hover:text-primary'
      >
        <Users className='h-4 w-4' />
        <span className='font-semibold'>{stats?.followers_count || 0}</span>
        <span className='text-muted-foreground'>팔로워</span>
      </button>

      <button
        onClick={onFollowingClick}
        className='flex items-center gap-1 transition-colors hover:text-primary'
      >
        <span className='font-semibold'>{stats?.following_count || 0}</span>
        <span className='text-muted-foreground'>팔로잉</span>
      </button>
    </div>
  );
};
