'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { followBroadcast } from '@/shared/lib/broadcastChannel';
import { Button } from '@/shared/ui/button';

import { followApi, followKeys } from '@/entities/follow';

/**
 * 팔로우/언팔로우 버튼
 *
 * 학습 포인트:
 * - React Query의 useMutation으로 낙관적 업데이트
 * - 팔로우 상태를 서버에서 조회하여 정확한 상태 유지
 * - 에러 처리 및 사용자 피드백 (toast)
 */
type FollowButtonProps = {
  userId: string; // 팔로우할 사용자 ID
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
};

export const FollowButton = ({
  userId,
  variant = 'default',
  size = 'default',
}: FollowButtonProps) => {
  const queryClient = useQueryClient();

  // 팔로우 여부 조회
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: followKeys.isFollowing(userId),
    queryFn: () => followApi.isFollowing(userId),
  });

  // 팔로우 Mutation
  const followMutation = useMutation({
    mutationFn: () => followApi.followUser({ following_id: userId }),
    onSuccess: () => {
      // 모든 팔로우 관련 쿼리 무효화 (최신 상태 반영)
      queryClient.invalidateQueries({ queryKey: followKeys.all });
      // 다른 탭에 팔로우 이벤트 전송
      followBroadcast.sendFollowEvent('follow', userId);
      toast.success('팔로우했습니다.');
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || '팔로우에 실패했습니다.');
    },
  });

  // 언팔로우 Mutation
  const unfollowMutation = useMutation({
    mutationFn: () => followApi.unfollowUser(userId),
    onSuccess: () => {
      // 모든 팔로우 관련 쿼리 무효화 (최신 상태 반영)
      queryClient.invalidateQueries({ queryKey: followKeys.all });
      // 다른 탭에 언팔로우 이벤트 전송
      followBroadcast.sendFollowEvent('unfollow', userId);
      toast.success('언팔로우했습니다.');
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || '언팔로우에 실패했습니다.');
    },
  });

  const handleClick = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className='h-4 w-4 animate-spin' />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
      ) : isFollowing ? (
        <UserMinus className='mr-2 h-4 w-4' />
      ) : (
        <UserPlus className='mr-2 h-4 w-4' />
      )}
      {isFollowing ? '언팔로우' : '팔로우'}
    </Button>
  );
};
