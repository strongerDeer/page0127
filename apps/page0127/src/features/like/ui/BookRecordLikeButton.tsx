'use client';

import { Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';

import { activityKeys } from '@/entities/activity';
import { bookLikeApi } from '@/entities/like';

import type { Activity } from '@/entities/activity';
import type { InfiniteData } from '@tanstack/react-query';

type BookRecordLikeButtonProps = {
  bookId: string;
  count: number;
  isLiked: boolean;
};

// 낙관적 업데이트 실패 시 되돌릴 이전 캐시 스냅샷
type LikeContext = { previousFeeds?: InfiniteData<Activity[]> };

/**
 * 책 단위 좋아요 버튼
 *
 * 학습 포인트:
 * - controlled 컴포넌트: count/isLiked 를 props 로만 받아 React Query 캐시가 단일 출처다.
 * - 피드는 useInfiniteQuery 라 캐시가 페이지 배열이다. 낙관적 업데이트는 그 안에서
 *   **같은 책의 카드 전부**를 뒤집어야 한다 — 한 책이 여러 페이지에 걸쳐 있을 수 있다.
 */
export const BookRecordLikeButton = ({
  bookId,
  count,
  isLiked,
}: BookRecordLikeButtonProps) => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) await bookLikeApi.removeLike(bookId);
      else await bookLikeApi.addLike(bookId);
    },
    onMutate: async (currentlyLiked: boolean): Promise<LikeContext> => {
      // 진행 중이던 refetch 응답이 낙관적 값을 덮어쓰지 않게 취소한다
      await queryClient.cancelQueries({ queryKey: activityKeys.feeds() });

      const previousFeeds = queryClient.getQueryData<InfiniteData<Activity[]>>(
        activityKeys.feeds()
      );

      queryClient.setQueriesData<InfiniteData<Activity[]>>(
        { queryKey: activityKeys.feeds() },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) =>
                item.book?.id === bookId
                  ? {
                      ...item,
                      likes: {
                        count: item.likes.count + (currentlyLiked ? -1 : 1),
                        isLiked: !currentlyLiked,
                      },
                    }
                  : item
              )
            ),
          }
      );

      return { previousFeeds };
    },
    onError: (error, _vars, context) => {
      if (context?.previousFeeds) {
        queryClient.setQueryData(activityKeys.feeds(), context.previousFeeds);
      }
      toast.error(getApiErrorMessage(error, '좋아요에 실패했습니다.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },
  });

  return (
    <Button
      variant='ghost'
      size='sm'
      className='gap-2'
      onClick={() => likeMutation.mutate(isLiked)}
      disabled={likeMutation.isPending}
      aria-pressed={isLiked}
      aria-label={isLiked ? '좋아요 취소' : '좋아요'}
    >
      <Heart
        className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
      />
      <span className='text-sm text-muted-foreground'>{count}</span>
    </Button>
  );
};
