'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';

import { bookApi } from '@/entities/book';

type BookLikeButtonProps = {
  bookId: string;
  initialLiked: boolean;
  className?: string;
};

/**
 * 책 좋아요 버튼 (React 19 useOptimistic 버전)
 *
 * 학습 포인트 — Day 53:
 * - 이 좋아요는 "이 카드 안에서만" 쓰는 로컬 상태 → useOptimistic이 딱 맞다
 *   (여러 화면이 공유하는 활동 좋아요(LikeButton)는 React Query 캐시가 맞다)
 * - 롤백 코드가 사라진다: 실패해도 기준 상태(liked)를 안 건드렸으니
 *   transition이 끝나면 optimisticLiked가 알아서 원래 값으로 복귀한다
 */
export const BookLikeButton = ({
  bookId,
  initialLiked,
  className,
}: BookLikeButtonProps) => {
  // 기준(실제) 상태 — 서버 응답으로만 갱신된다. 낙관적 값의 "돌아올 자리"
  const [liked, setLiked] = useState(initialLiked);
  // 낙관적 오버레이 — 화면에 그릴 값. 평소엔 liked와 같고, transition 동안만 덧칠된다
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);
  // useMutation의 isPending을 대체 — transition 진행 여부
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    // ⚠️ setOptimisticLiked는 반드시 transition(또는 form action) 안에서 호출해야 한다
    startTransition(async () => {
      setOptimisticLiked(!liked); // ① 즉시 하트 토글 (서버 응답 전)
      try {
        const data = await bookApi.toggleLike(bookId); // ② 서버 처리
        setLiked(data.liked); // ③ 성공: 실제 기준 상태 갱신
        router.refresh();
      } catch {
        // ④ 실패: 롤백 코드 없음! liked를 안 건드렸으니 transition 종료 시
        //    optimisticLiked가 자동으로 원래 값(false)으로 복귀한다.
        //    단, "왜 돌아왔는지" 알림은 자동이 아니므로 toast는 직접 띄운다.
        toast.error('좋아요 처리 중 오류가 발생했습니다.');
      }
    });
  };

  return (
    <Button
      variant='ghost'
      size='icon'
      className={`relative z-30 h-8 w-8 rounded-full bg-card shadow-sm transition-transform hover:scale-110 ${className}`}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          // 화면엔 기준값(liked)이 아니라 낙관적 오버레이(optimisticLiked)를 그린다
          optimisticLiked ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground'
        }`}
      />
    </Button>
  );
};
