'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { activityKeys } from '@/entities/activity';
import { likeApi } from '@/entities/like';

import type { Activity } from '@/entities/activity';
import type { InfiniteData } from '@tanstack/react-query';

type LikeButtonProps = {
  activityId: string;
  count: number;
  isLiked: boolean;
};

// 낙관적 업데이트 실패 시 되돌릴 이전 캐시 스냅샷
type LikeContext = {
  previousFeeds?: InfiniteData<Activity[]>;
  previousDetail?: Activity;
};

/**
 * 좋아요 버튼 컴포넌트
 *
 * 학습 포인트:
 * - 낙관적 업데이트(정석): useState가 아니라 React Query 캐시를 직접 수정
 * - 같은 활동이 피드(useInfiniteQuery)와 상세(useQuery) 두 캐시에 들어있어
 *   둘 다 수정해야 어느 화면에서 눌러도 일관되게 반영된다
 * - controlled 컴포넌트: count/isLiked를 props로만 받아 캐시가 곧 단일 출처(SSOT)
 */
export const LikeButton = ({ activityId, count, isLiked }: LikeButtonProps) => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await likeApi.removeLike(activityId);
      } else {
        await likeApi.addLike(activityId);
      }
    },
    // ① 요청 직전: 진행 중 refetch를 취소하고 캐시를 직접 뒤집는다
    onMutate: async (currentlyLiked: boolean): Promise<LikeContext> => {
      // cancelQueries: 진행 중이던 refetch 응답이 낙관적 값을 덮어쓰는 것 방지
      await queryClient.cancelQueries({ queryKey: activityKeys.feeds() });
      await queryClient.cancelQueries({
        queryKey: activityKeys.detail(activityId),
      });

      // 롤백용 스냅샷 확보
      const previousFeeds = queryClient.getQueryData<InfiniteData<Activity[]>>(
        activityKeys.feeds()
      );
      const previousDetail = queryClient.getQueryData<Activity>(
        activityKeys.detail(activityId)
      );

      // 해당 활동의 좋아요 상태/카운트만 뒤집는 헬퍼
      const toggle = (activity: Activity): Activity =>
        activity.id === activityId
          ? {
              ...activity,
              likes: {
                isLiked: !currentlyLiked,
                count: currentlyLiked
                  ? activity.likes.count - 1
                  : activity.likes.count + 1,
              },
            }
          : activity;

      // 피드 캐시 수정 (InfiniteData → pages: Activity[][])
      queryClient.setQueryData<InfiniteData<Activity[]>>(
        activityKeys.feeds(),
        (old) =>
          old
            ? { ...old, pages: old.pages.map((page) => page.map(toggle)) }
            : old
      );

      // 상세 캐시 수정 (단일 Activity, 캐시에 없으면 그대로 둔다)
      queryClient.setQueryData<Activity>(activityKeys.detail(activityId), (old) =>
        old ? toggle(old) : old
      );

      return { previousFeeds, previousDetail };
    },
    // ② 실패: 스냅샷으로 캐시 복구
    onError: (_error, _currentlyLiked, context) => {
      if (context?.previousFeeds) {
        queryClient.setQueryData(activityKeys.feeds(), context.previousFeeds);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          activityKeys.detail(activityId),
          context.previousDetail
        );
      }
      toast.error('좋아요 처리에 실패했습니다.');
    },
    // ③ 성공/실패 무관: 서버 기준으로 최종 동기화
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
      queryClient.invalidateQueries({
        queryKey: activityKeys.detail(activityId),
      });
    },
  });

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={() => likeMutation.mutate(isLiked)}
      disabled={likeMutation.isPending}
      className='gap-2'
    >
      <Heart
        className={`h-4 w-4 transition-all ${
          isLiked
            ? 'fill-chart-5 text-chart-5'
            : 'text-muted-foreground hover:text-chart-5'
        }`}
      />
      <span className='text-sm text-muted-foreground'>{count}</span>
    </Button>
  );
};
