import Link from 'next/link';

import { BookCover } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import { toCoverSource } from '@/entities/book';

import type { Book } from '@/entities/book';

type ReadingNowStripProps = {
  /** 읽는 중(reading) 책 — 보통 1~2권 */
  books: Book[];
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
};

/**
 * '지금 읽는 중' 강조 스트립
 *
 * 읽는 중인 책은 가장 활발한 책이라 흐리게(opacity) 처리하는 대신
 * 서재 맨 위에 primary 톤으로 앞세운다.
 * - 읽는 책이 없으면 렌더링하지 않는다(null).
 * - 여러 권이면 가로 스크롤로 넘긴다.
 */
export const ReadingNowStrip = ({ books, bookHref }: ReadingNowStripProps) => {
  if (books.length === 0) return null;

  return (
    // 한 줄(높이 ~72px) — 살아 있는 책장이라는 신호이지 주인공은 아니라서 작게 둔다
    <section className='flex items-center gap-4 overflow-x-auto rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5'>
      <h3 className='flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-strong'>
        <BookOpen className='size-4 text-primary' />
        지금 읽는 중
        <span className='font-normal text-text-subtle'>{books.length}권</span>
      </h3>

      <ul className='flex gap-4'>
        {books.map((book) => (
          <li key={book.id} className='shrink-0'>
            <Link
              href={bookHref(book)}
              className='group flex items-center gap-2'
            >
              {/* 표지는 그림자로 띄우지 않는다(07 §2.3) — 도메인 셰이프는 BookCover 가 맡는다 */}
              <span className='relative block h-12 w-8 bg-muted'>
                <BookCover
                  {...toCoverSource(book)}
                  title={book.title}
                  size='fill'
                  sizes='32px'
                  decorative
                />
              </span>
              <span className='max-w-40 truncate text-sm text-text-body group-hover:text-primary'>
                {book.title}
              </span>
              {book.start_date && (
                <span className='text-xs text-text-subtle'>
                  {Number(book.start_date.slice(5, 7))}/
                  {Number(book.start_date.slice(8, 10))}~
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
