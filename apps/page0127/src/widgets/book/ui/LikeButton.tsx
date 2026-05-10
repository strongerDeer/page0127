'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { bookApi } from '@/entities/book';

type LikeButtonProps = {
  bookId: string;
  initialLiked: boolean;
  className?: string;
};

export const LikeButton = ({
  bookId,
  initialLiked,
  className,
}: LikeButtonProps) => {
  const [liked, setLiked] = useState(initialLiked);
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: () => bookApi.toggleLike(bookId),
    // 낙관적 업데이트: 요청 전에 UI 즉시 변경
    onMutate: () => {
      setLiked((prev) => !prev);
    },
    onSuccess: (data) => {
      setLiked(data.liked);
      router.refresh();
    },
    onError: () => {
      // 실패 시 원래 상태로 되돌리기
      setLiked((prev) => !prev);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    },
  });

  return (
    <Button
      variant='ghost'
      size='icon'
      className={`relative z-30 h-8 w-8 rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${className}`}
      onClick={() => mutate()}
      disabled={isPending}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          liked ? 'fill-red-500 text-red-500' : 'text-gray-500'
        }`}
      />
    </Button>
  );
};
