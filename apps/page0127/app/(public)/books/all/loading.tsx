import { Skeleton } from '@repo/ui';
import { PageContainer } from '@repo/ui';

import { BookListItemSkeleton } from '@/widgets/book/ui/BookListItemSkeleton';

/**
 * /books/all 라우트 로딩 UI
 *
 * 학습 포인트:
 * - page.tsx의 6개 await가 끝나기 전까지 즉시 노출
 * - 실제 페이지와 동일한 헤더 + 그리드 + 페이지네이션 외곽 유지
 * - 그리드 컬럼 수도 실제와 동일하게 (sm:3, md:4, lg:5, xl:6)
 */
export default function Loading() {
  return (
    <PageContainer width='wide'>
      {/*
        Header

        ⚠️ 스켈레톤도 375px 안에 들어와야 한다. 예전에는 부제목이 `w-80`(320px) 고정이라
        정렬 버튼 자리(128px)와 합쳐 448px이 되어 **로딩 동안만 가로 스크롤이 생겼다.**
        목록이 뜨면 사라지므로 눈으로는 잡기 어렵다(실측으로 발견).
        폭을 최대치로만 두고 좁은 화면에서는 줄어들게 한다.
      */}
      <div className='mb-8 flex items-center justify-between gap-4'>
        <div className='min-w-0 flex-1 space-y-2'>
          <Skeleton className='h-9 w-full max-w-56' />
          <Skeleton className='h-5 w-full max-w-80' />
        </div>
        <div className='flex shrink-0 gap-2'>
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
        </div>
      </div>

      {/* Book Grid — 한 페이지 limit이 20이라 12개 정도 그려두면 첫 화면 충분 */}
      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
        {Array.from({ length: 12 }).map((_, i) => (
          <BookListItemSkeleton key={i} />
        ))}
      </div>

      {/* Pagination */}
      <div className='mt-12 flex justify-center gap-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-9 w-9' />
        ))}
      </div>
    </PageContainer>
  );
}
