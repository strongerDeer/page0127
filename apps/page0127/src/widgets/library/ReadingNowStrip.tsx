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
 * - 표지를 앞세우고 제목은 말풍선으로만 — 제목이 줄지어 있으면 표지가 작아져 눈에 안 띄었다.
 * - 줄을 넘기면 다음 줄로(가로 스크롤 상자는 위로 뜨는 말풍선을 잘라 버린다).
 */
export const ReadingNowStrip = ({ books, bookHref }: ReadingNowStripProps) => {
  if (books.length === 0) return null;

  return (
    <section className='flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3'>
      <h3 className='flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-strong'>
        <BookOpen className='size-4 text-primary' />
        지금 읽는 중
        <span className='font-normal text-text-subtle'>{books.length}권</span>
      </h3>

      <ul className='flex flex-wrap gap-3'>
        {books.map((book) => {
          const since = book.start_date
            ? `${Number(book.start_date.slice(5, 7))}/${Number(book.start_date.slice(8, 10))}`
            : null;
          return (
            <li key={book.id} className='group relative'>
              <Link
                href={bookHref(book)}
                // 제목이 화면에 상시 보이지 않으므로 링크 이름에 담는다
                aria-label={`${book.title}, ${since ? `${since}부터 ` : ''}읽는 중`}
                className='block transition-transform group-hover:-translate-y-0.5 focus-visible:-translate-y-0.5'
              >
                {/* 표지는 그림자로 띄우지 않는다(07 §2.3) — 도메인 셰이프는 BookCover 가 맡는다 */}
                <span className='relative block h-21 w-14 bg-muted'>
                  <BookCover
                    {...toCoverSource(book)}
                    title={book.title}
                    size='fill'
                    sizes='56px'
                    decorative
                  />
                </span>
              </Link>
              {/* 마우스를 올리거나 키보드로 이동했을 때만 보이는 제목 — 읽는 건 링크 이름이 한다 */}
              <span
                role='tooltip'
                aria-hidden='true'
                className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-48 -translate-x-1/2 rounded-lg bg-text-strong px-2 py-1 text-center text-xs text-card opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'
              >
                {book.title}
                {since && ` · ${since}~`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
