import Link from 'next/link';

import { BookCover, StatePanel } from '@repo/ui';
import { Quote } from 'lucide-react';

import type { QuoteShelfGroup } from '@/entities/quote';

type MyQuotesListProps = {
  username: string;
  groups: QuoteShelfGroup[];
};

/**
 * "내가 모은 문장" — 책 표지만 늘어놓고 오른쪽 위에 문장 개수를 단다(HJ, 2026-11-10).
 *
 * 왜 문장을 펼쳐 보이지 않나: 한 책에 문장을 수십 개 적을 수도 있어서, 문장을 다
 * 보여 주면 책 몇 권만으로 페이지가 끝없이 길어진다. 책 한 권 = 칸 하나로 두고,
 * 문장은 표지를 눌러 책 상세의 "내가 모은 문장"(#my-quotes)에서 읽고 고친다.
 * (고치는 곳을 한 군데로 두는 효과도 있다)
 *
 * 책 기록을 모두 지운 책은 갈 상세가 없어 링크 없이 표지만 그린다.
 */
export const MyQuotesList = ({ username, groups }: MyQuotesListProps) => {
  if (groups.length === 0) {
    return (
      <StatePanel
        icon={<Quote className='size-6' />}
        message={
          <>
            아직 모은 문장이 없어요.
            <br />책 상세의 &lsquo;내가 모은 문장&rsquo;에서 마음에 남은 문장을
            적어 보세요.
          </>
        }
      />
    );
  }

  const quoteCount = groups.reduce((sum, g) => sum + g.quotes.length, 0);

  return (
    <div className='flex flex-col gap-5'>
      <p className='text-sm text-text-subtle'>
        책 {groups.length}권에서 문장 {quoteCount}개를 모았어요
      </p>

      <ul className='grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6'>
        {groups.map(({ isbn, book, quotes }) => {
          const title = book?.title ?? '지운 책';
          const label = `${title}, 문장 ${quotes.length}개`;
          const body = (
            <>
              <div className='relative'>
                <BookCover
                  src={book?.cover_image}
                  title={title}
                  author={book?.author}
                  size='full'
                  decorative
                />
                <span
                  aria-hidden
                  className='absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-[1.5px] border-primary bg-background px-1.5 text-xs font-bold tabular-nums text-primary'
                >
                  {quotes.length}
                </span>
              </div>
              <span className='mt-2 line-clamp-2 break-keep text-xs text-text-body'>
                {title}
              </span>
            </>
          );

          return (
            <li key={isbn}>
              {book ? (
                <Link
                  href={`/${username}/${book.id}#my-quotes`}
                  aria-label={label}
                  className='flex flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring'
                >
                  {body}
                </Link>
              ) : (
                <div aria-label={label} role='group' className='flex flex-col'>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
