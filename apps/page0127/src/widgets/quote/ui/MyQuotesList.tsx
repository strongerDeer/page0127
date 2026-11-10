import Link from 'next/link';

import { BookCover, StatePanel } from '@repo/ui';
import { Quote } from 'lucide-react';

import type { QuoteShelfGroup } from '@/entities/quote';

type MyQuotesListProps = {
  username: string;
  groups: QuoteShelfGroup[];
};

/**
 * "내가 적은 문장" — 책 한 권 = 한 묶음. 최근에 문장을 적은 책이 위.
 *
 * 읽기 전용이다. 고치고 지우는 곳은 책 상세의 "간직한 문장" 하나로 둔다
 * (같은 일을 두 군데서 하게 하면 둘 중 하나는 반드시 낡는다). 그래서 묶음마다
 * 그 책 상세로 가는 링크를 단다.
 */
export const MyQuotesList = ({ username, groups }: MyQuotesListProps) => {
  if (groups.length === 0) {
    return (
      <StatePanel
        icon={<Quote className='size-6' />}
        message={
          <>
            아직 적어 둔 문장이 없어요.
            <br />책 상세의 &lsquo;간직한 문장&rsquo;에서 마음에 남은 문장을
            적어 보세요.
          </>
        }
      />
    );
  }

  return (
    <ul className='flex flex-col gap-4'>
      {groups.map(({ isbn, book, quotes }) => {
        const href = book ? `/${username}/${book.id}` : null;
        const title = book?.title ?? '지운 책';

        return (
          <li
            key={isbn}
            className='rounded-2xl border border-line-soft bg-card p-4 sm:p-5'
          >
            <article
              aria-label={`${title}에서 적은 문장 ${quotes.length}개`}
              className='flex gap-4'
            >
              <div className='shrink-0'>
                {href ? (
                  // 바로 옆 제목 링크와 같은 곳이라 탭 순서에서는 뺀다
                  <Link href={href} tabIndex={-1} aria-hidden>
                    <BookCover
                      src={book?.cover_image}
                      title={title}
                      author={book?.author}
                      size='sm'
                      small
                      decorative
                    />
                  </Link>
                ) : (
                  <BookCover title={title} size='sm' small decorative />
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <h3 className='break-keep text-sm font-bold text-text-strong'>
                  {href ? (
                    <Link
                      href={href}
                      className='underline-offset-4 hover:underline'
                    >
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </h3>
                {book?.author && (
                  <p className='mt-0.5 text-xs text-text-subtle'>
                    {book.author}
                  </p>
                )}

                <ul className='mt-3 flex flex-col gap-3'>
                  {quotes.map((quote) => (
                    <li
                      key={quote.id}
                      className='border-l-2 border-line-soft pl-3'
                    >
                      <blockquote className='whitespace-pre-wrap break-keep text-sm leading-relaxed text-text-strong'>
                        {quote.text}
                      </blockquote>
                      {quote.page && (
                        <p className='mt-1 text-xs text-text-subtle'>
                          p. {quote.page}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
};
