'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/shared/ui/button';

type BookRankingErrorProps = {
  // 어느 랭킹이 실패했는지 표시 (스켈레톤과 같은 외곽 유지용)
  title?: string;
};

/**
 * BookRankingSection 실패 시 Error Boundary fallback
 *
 * 학습 포인트:
 * - Skeleton(로딩) ↔ Error(실패) ↔ Section(성공) 3상태를 대칭으로 둔다
 * - 영역 단위 fallback이라 min-h-screen 전체화면이 아니라 섹션 외곽만 차지
 * - Server Component 데이터 에러는 client setState reset만으론 재요청이 안 됨
 *   → router.refresh()로 서버에서 다시 fetch (Day 62: "reset은 원인을 못 고친다")
 */
export const BookRankingError = ({ title }: BookRankingErrorProps) => {
  const router = useRouter();

  return (
    <section className='py-8'>
      {title && (
        <div className='mb-6'>
          <h2 className='heading-2'>{title}</h2>
        </div>
      )}
      <div className='flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card py-12'>
        <p className='text-muted-foreground'>
          랭킹을 불러오지 못했어요. 잠시 후 다시 시도해주세요.
        </p>
        <Button variant='outline' onClick={() => router.refresh()}>
          다시 시도
        </Button>
      </div>
    </section>
  );
};
