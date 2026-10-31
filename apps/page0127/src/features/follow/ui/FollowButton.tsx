'use client';

import { Button } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { followBroadcast } from '@/shared/lib/broadcastChannel';

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
  // variant 는 의도적으로 좁힌다 — 팔로우 버튼에 destructive·link 를 쓸 일이
  // 없고, 좁혀 두면 호출부가 잘못 고르는 것을 타입이 막는다.
  variant?: Extract<
    React.ComponentProps<typeof Button>['variant'],
    'default' | 'outline'
  >;
  // 크기는 시스템 이름을 그대로 물려받는다(sm/md/lg).
  size?: React.ComponentProps<typeof Button>['size'];
  /** 서버가 페이지와 함께 읽어 온 팔로우 여부 — 있으면 버튼이 처음부터 맞는 라벨로 뜬다 */
  initialIsFollowing?: boolean;
};

export const FollowButton = ({
  userId,
  variant = 'default',
  size = 'md',
  initialIsFollowing,
}: FollowButtonProps) => {
  const queryClient = useQueryClient();

  // 팔로우 여부 조회
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: followKeys.isFollowing(userId),
    queryFn: () => followApi.isFollowing(userId),
    initialData: initialIsFollowing,
  });

  // 버튼 라벨을 서버 왕복 전에 뒤집어 둔다. 실패 시 onError에서 되돌린다.
  const optimisticToggle = async (next: boolean) => {
    await queryClient.cancelQueries({
      queryKey: followKeys.isFollowing(userId),
    });
    const previous = queryClient.getQueryData<boolean>(
      followKeys.isFollowing(userId)
    );
    queryClient.setQueryData(followKeys.isFollowing(userId), next);
    return { previous };
  };

  const rollbackToggle = (previous: boolean | undefined) => {
    if (previous !== undefined) {
      queryClient.setQueryData(followKeys.isFollowing(userId), previous);
    }
  };

  // 팔로우 Mutation
  const followMutation = useMutation({
    mutationFn: () => followApi.followUser({ following_id: userId }),
    onMutate: () => optimisticToggle(true),
    onSuccess: () => {
      // 다른 탭에 팔로우 이벤트 전송
      followBroadcast.sendFollowEvent('follow', userId);
      toast.success('팔로우했습니다.');
    },
    onError: (error, _vars, context) => {
      rollbackToggle(context?.previous);
      toast.error(getApiErrorMessage(error, '팔로우에 실패했습니다.'));
    },
    // 팔로워 수·목록 등 나머지 팔로우 쿼리를 서버 값으로 맞춘다
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followKeys.all });
    },
  });

  // 언팔로우 Mutation
  const unfollowMutation = useMutation({
    mutationFn: () => followApi.unfollowUser(userId),
    onMutate: () => optimisticToggle(false),
    onSuccess: () => {
      // 다른 탭에 언팔로우 이벤트 전송
      followBroadcast.sendFollowEvent('unfollow', userId);
      toast.success('언팔로우했습니다.');
    },
    onError: (error, _vars, context) => {
      rollbackToggle(context?.previous);
      toast.error(getApiErrorMessage(error, '언팔로우에 실패했습니다.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: followKeys.all });
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

  // 로딩 중에도 완성된 버튼과 같은 폭(아이콘 + '팔로우')을 차지한다.
  // 아이콘만 있는 좁은 버튼으로 두면 데이터가 온 뒤 폭이 늘어, 좁은 화면에서
  // 옆 버튼이 다음 줄로 밀리며 헤더 아래 전체가 내려간다(모바일 프로필 CLS 0.11).
  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled aria-busy>
        <Loader2 aria-hidden className='mr-2 h-4 w-4 animate-spin' />
        팔로우
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
      {/* 낙관적 업데이트로 상태가 즉시 뒤집히므로 대기 스피너를 띄우지 않는다.
          연타 방지는 disabled가 맡는다. */}
      {isFollowing ? (
        <UserMinus className='mr-2 h-4 w-4' />
      ) : (
        <UserPlus className='mr-2 h-4 w-4' />
      )}
      {isFollowing ? '언팔로우' : '팔로우'}
    </Button>
  );
};
