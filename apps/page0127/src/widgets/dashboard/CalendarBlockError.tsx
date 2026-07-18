'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/shared/ui/button';

/**
 * CalendarSection 실패 시 Error Boundary fallback
 *
 * 학습 포인트:
 * - CalendarBlockSkeleton(로딩)과 같은 카드 외곽을 유지 → 레이아웃 흔들림 방지
 * - 캘린더만 실패해도 대시보드 통계·차트는 그대로 (영역 격리)
 * - Server Component 데이터 에러 → router.refresh()로 서버 재fetch
 */
export const CalendarBlockError = () => {
  const router = useRouter();

  return (
    <div className='rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex flex-col items-center justify-center gap-3 py-8 text-center'>
        <p className='text-sm text-muted-foreground'>
          캘린더를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
        <Button variant='outline' onClick={() => router.refresh()}>
          다시 시도
        </Button>
      </div>
    </div>
  );
};
