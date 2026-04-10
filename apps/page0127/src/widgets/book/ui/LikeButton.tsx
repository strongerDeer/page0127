'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch('/api/books/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('로그인이 필요합니다.');
          return;
        }
        throw new Error('Failed to like');
      }

      const data = await response.json();
      setLiked(data.liked);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant='ghost'
      size='icon'
      className={`relative z-30 h-8 w-8 rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${className}`}
      onClick={toggleLike}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          liked ? 'fill-red-500 text-red-500' : 'text-gray-500'
        }`}
      />
    </Button>
  );
};
