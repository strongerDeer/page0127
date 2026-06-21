'use client';

import { memo } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';

import type { Book } from '@/entities/book';

type BookGridItemProps = {
  /** 표시할 책 — DashboardBookList의 filter/sort 결과라 객체 참조가 유지된다 */
  book: Book;

  /** 클릭 시 이동 경로 (부모에서 bookHref(book)로 계산해 string으로 전달) */
  href: string;
};

/**
 * 학습 포인트 — React.memo
 *
 * 부모(DashboardBookList)는 검색어 입력·페이지 전환·필터 변경 등으로 자주 리렌더된다.
 * 그때마다 paginatedBooks.map이 다시 돌아 모든 그리드 아이템이 리렌더되는데,
 * 화면에 보이는 책 대부분은 사실 그대로다.
 *
 * memo로 감싸면 React가 이전 props와 현재 props를 얕은 비교한다:
 *  - book : filter()/sort()는 원본 객체 참조를 유지 → 같은 책이면 prev.book === next.book
 *  - href : string(원시값)이라 값 비교 → 같으면 통과
 * 둘 다 같으면 이 아이템은 리렌더를 "건너뛴다".
 *
 * ⚠️ 만약 부모가 href를 인라인 함수로 매번 새로 만들거나 book을 spread({...book})로
 *    복사했다면 참조가 매번 달라져 memo가 무효화된다. 지금은 둘 다 안정적이라 효과가 있다.
 */
export const BookGridItem = memo(({ book, href }: BookGridItemProps) => {
  return (
    <Link href={href} className='group transition-transform hover:scale-105'>
      <div className='aspect-2/3 relative overflow-hidden rounded-lg bg-muted'>
        {book.cover_image ? (
          <Image
            src={book.cover_image}
            alt={book.title}
            fill
            sizes='(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw'
            className='object-cover'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-4xl'>
            📚
          </div>
        )}
        {book.read_count > 1 && (
          <div className='absolute right-2 top-2'>
            <ReadCountBadge readCount={book.read_count} size='sm' />
          </div>
        )}
      </div>
      <p className='mt-2 line-clamp-2 text-xs text-foreground group-hover:text-primary'>
        {book.title}
      </p>
    </Link>
  );
});

// memo()로 감싸면 DevTools에 'Anonymous'로 잡혀 Profiler에서 식별이 어렵다 → 이름 명시
BookGridItem.displayName = 'BookGridItem';
