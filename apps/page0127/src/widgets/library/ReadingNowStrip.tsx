'use client';

import { useRef } from 'react';

import Link from 'next/link';

import { BookCover } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import {
  isLongReading,
  readingDayCount,
  readingSince,
  toCoverSource,
} from '@/entities/book';

import { tooltipShift } from '@/widgets/book/model/tooltipShift';

import type { Book } from '@/entities/book';

type ReadingNowStripProps = {
  /** 읽는 중(reading) 책 — 보통 1~2권 */
  books: Book[];
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
  /**
   * 한국 시간 기준 오늘 'YYYY-MM-DD' — 주인 화면에서만 넘긴다.
   * 있으면 2주 넘게 읽는 책에 'N일째' 넛지를 붙인다(방문자에게 재촉할 이유는 없다).
   */
  nudgeToday?: string;
};

/**
 * '지금 읽는 중' 강조 스트립
 *
 * 읽는 중인 책은 가장 활발한 책이라 흐리게(opacity) 처리하는 대신
 * 서재 맨 위의 흰색 카드와 primary 아이콘으로 앞세운다.
 * - 읽는 책이 없으면 렌더링하지 않는다(null).
 * - 표지를 앞세우고 제목은 말풍선으로만 — 제목이 줄지어 있으면 표지가 작아져 눈에 안 띄었다.
 * - 줄을 넘기면 다음 줄로(가로 스크롤 상자는 위로 뜨는 말풍선을 잘라 버린다).
 * - 말풍선은 표지보다 넓어 양 끝 표지에선 스트립 밖으로 삐져나간다.
 *   숨어 있어도(opacity 0) 페이지 폭을 늘리므로 가로만 잘라(overflow-x: clip — 위로 뜨는 건 그대로)
 *   두고, 보일 때 재서 안쪽으로 민다(PublicBookShelf 와 같은 방식).
 */
export const ReadingNowStrip = ({
  books,
  bookHref,
  nudgeToday,
}: ReadingNowStripProps) => {
  const stripRef = useRef<HTMLElement>(null);

  if (books.length === 0) return null;

  const placeTip = (event: React.SyntheticEvent<HTMLElement>) => {
    const tip =
      event.currentTarget.querySelector<HTMLElement>('[role="tooltip"]');
    const strip = stripRef.current;
    if (!tip || !strip) return;
    tip.style.setProperty('--tip-shift', '0px');
    const shift = tooltipShift(
      tip.getBoundingClientRect(),
      strip.getBoundingClientRect()
    );
    tip.style.setProperty('--tip-shift', `${shift}px`);
  };

  return (
    <section
      ref={stripRef}
      className='flex flex-wrap items-center gap-x-5 gap-y-3 overflow-x-clip rounded-2xl border border-line-soft bg-card px-5 py-3'
    >
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
          const dayCount = nudgeToday
            ? readingDayCount(readingSince(book), nudgeToday)
            : null;
          const isLong = dayCount !== null && isLongReading(dayCount);
          return (
            <li
              key={book.id}
              className='group relative'
              onMouseEnter={placeTip}
              onFocus={placeTip}
            >
              <Link
                // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
                prefetch={false}
                href={bookHref(book)}
                // 제목이 화면에 상시 보이지 않으므로 링크 이름에 담는다
                aria-label={`${book.title}, ${since ? `${since}부터 ` : ''}읽는 중${
                  isLong ? `, ${dayCount}일째` : ''
                }`}
                className='block transition-transform group-hover:-translate-y-0.5 focus-visible:-translate-y-0.5'
              >
                {/* 표지는 그림자로 띄우지 않는다(07 §2.3) — 도메인 셰이프는 BookCover 가 맡는다 */}
                <span className='relative block h-21 w-14 bg-muted'>
                  <BookCover
                    {...toCoverSource(book)}
                    title={book.title}
                    size='fill'
                    sizes='56px'
                    // 56px 칸이라 3x 화면에서도 M 이면 충분하다(없으면 256 단계 → L)
                    small
                    decorative
                  />
                  {/* 2주 넘게 읽는 중 — 완독·중단을 정리하라는 가벼운 넛지 */}
                  {isLong && (
                    <span
                      aria-hidden
                      data-reading-nudge
                      className='absolute inset-x-0 bottom-0 bg-text-strong/80 py-0.5 text-center text-[10px] font-medium text-card'
                    >
                      {dayCount}일째
                    </span>
                  )}
                </span>
              </Link>
              {/* 마우스를 올리거나 키보드로 이동했을 때만 보이는 제목 — 읽는 건 링크 이름이 한다 */}
              <span
                role='tooltip'
                aria-hidden='true'
                className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-48 translate-x-[calc(-50%+var(--tip-shift))] rounded-lg [--tip-shift:0px] bg-text-strong px-2 py-1 text-center text-xs text-card opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'
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
