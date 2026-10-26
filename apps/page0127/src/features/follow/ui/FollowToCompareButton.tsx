'use client';
import { Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { followBroadcast } from '@/shared/lib/broadcastChannel';

import { followApi, followKeys } from '@/entities/follow';

export const FollowToCompareButton = ({
  userId,
  name,
  onFollowed,
}: {
  userId: string;
  name: string;
  onFollowed: () => Promise<void>;
}) => {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => followApi.followUser({ following_id: userId }),
    onSuccess: async () => {
      cache.setQueryData(followKeys.isFollowing(userId), true);
      followBroadcast.sendFollowEvent('follow', userId);
      void cache.invalidateQueries({ queryKey: followKeys.all });
      await onFollowed();
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, '팔로우하지 못했어요. 다시 시도해 주세요.')
      );
      void cache.invalidateQueries({ queryKey: followKeys.all });
    },
  });
  return (
    <Button
      type='button'
      className='w-full'
      loading={mutation.isPending}
      aria-label={`${name}님 팔로우하고 비교하기`}
      onClick={() => mutation.mutate()}
    >
      {!mutation.isPending && <UserPlus size={16} aria-hidden='true' />}
      {mutation.isPending ? '올해 기록을 불러오는 중' : '팔로우하고 비교하기'}
    </Button>
  );
};
