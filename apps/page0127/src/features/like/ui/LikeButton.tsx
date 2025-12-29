'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { likeApi } from '@/entities/like';

type LikeButtonProps = {
  activityId: string;
  initialCount: number;
  initialIsLiked: boolean;
};

/**
 * 좋아요 버튼 컴포넌트
 *
 * 학습 포인트:
 * - 낙관적 업데이트: 로컬 상태로 즉시 UI 업데이트
 * - props로 초기 데이터를 받아 불필요한 API 호출 제거
 * - useMutation으로 좋아요 추가/취소
 */
export const LikeButton = ({
  activityId,
  initialCount,
  initialIsLiked,
}: LikeButtonProps) => {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);

  // 좋아요 추가/취소 뮤테이션
  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await likeApi.removeLike(activityId);
      } else {
        await likeApi.addLike(activityId);
      }
    },
    // 낙관적 업데이트: 요청 전에 UI 즉시 업데이트
    onMutate: async (currentlyLiked: boolean) => {
      setIsLiked(!currentlyLiked);
      setCount((prev) => (currentlyLiked ? prev - 1 : prev + 1));
    },
    // 성공 시 피드 데이터 갱신
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feed', 'activities'],
      });
    },
    // 에러 발생 시 원래 상태로 되돌리기
    onError: (_error, currentlyLiked) => {
      setIsLiked(currentlyLiked);
      setCount((prev) => (currentlyLiked ? prev + 1 : prev - 1));
      toast.error('좋아요 처리에 실패했습니다.');
    },
  });

  const handleLike = () => {
    likeMutation.mutate(isLiked);
  };

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={handleLike}
      disabled={likeMutation.isPending}
      className='gap-2'
    >
      <Heart
        className={`h-4 w-4 transition-all ${
          isLiked
            ? 'fill-red-500 text-red-500'
            : 'text-muted-foreground hover:text-red-500'
        }`}
      />
      <span className='text-sm text-muted-foreground'>{count}</span>
    </Button>
  );
};
