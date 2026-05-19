import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 책 그리드 아이템 fallback
 *
 * 학습 포인트:
 * - BookListItem의 세로 카드 모양(표지 + 제목 + 저자)을 그대로 흉내
 * - aspect-[2/3]으로 표지 비율 고정 → 실제 이미지 로딩 후에도 점프 없음
 */
export const BookListItemSkeleton = () => {
  return (
    <div className='space-y-3'>
      <Skeleton className='aspect-[2/3] w-full rounded-md' />
      <Skeleton className='h-4 w-3/4' />
      <Skeleton className='h-3 w-1/2' />
    </div>
  );
};
