import Link from 'next/link';

import { BookCover } from '@repo/ui';
import { BookOpen } from 'lucide-react';

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
    <section className='rounded-2xl border border-primary/20 bg-primary/5 p-4'>
      <div className='mb-3 flex items-center gap-2'>
        <BookOpen className='h-4 w-4 text-primary' />
        <h3 className='text-sm font-medium text-text-strong'>지금 읽는 중</h3>
        <span className='text-sm text-text-subtle'>{books.length}권</span>
      </div>

      <ul className='flex gap-4 overflow-x-auto pb-1'>
        {books.map((book) => (
          <li key={book.id} className='shrink-0'>
            <Link
              href={bookHref(book)}
              className='group flex w-24 flex-col gap-2'
            >
              {/* 대칭 rounded-md 와 shadow-sm 을 쓰고 있었다 — 표지는 그림자로
                  띄우지 않는다(07 §2.3). BookCover 로 바꾸며 도메인 셰이프로 통일했다 */}
              <div className='aspect-2/3 relative bg-muted'>
                <BookCover
                  src={book.cover_image}
                  title={book.title}
          size='fill'
        />
              </div>
              <p className='line-clamp-2 text-xs text-text-body group-hover:text-primary'>
                {book.title}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
