import Link from 'next/link';

import { BookCover } from '@repo/ui';
import { Star } from 'lucide-react';

import { RATING_MAX, toCoverSource } from '@/entities/book';

import type { getStoryBook } from '../api/getStoryBook';

type StoryBookCardProps = {
  bookId: string;
  bookTitle: string;
  author: string;
  /** HJ 별점. 0 이면 그리지 않는다 */
  rating: number;
  book: Awaited<ReturnType<typeof getStoryBook>>;
  /** 페이지 위(표지 포함)와 끝(짧은 안내) 두 곳에 쓴다 */
  variant?: 'top' | 'end';
};

/**
 * 이야기 ↔ 책 정보 페이지를 잇는 카드 (서버 컴포넌트).
 *
 * "서재에 담기"는 로그인 상태에 따라 달라지는 버튼이라 여기 두지 않는다 — 책 정보 페이지가
 * 이미 브라우저에서 그 버튼을 그린다. 이 카드는 거기로 보내는 역할만 한다(정적 페이지 유지).
 */
export const StoryBookCard = ({
  bookId,
  bookTitle,
  author,
  rating,
  book,
  variant = 'top',
}: StoryBookCardProps) => {
  const href = `/books/info/${bookId}`;

  if (variant === 'end') {
    return (
      <aside className='rounded-2xl border border-line bg-muted p-5'>
        <p className='font-semibold text-text-strong'>
          이 책, 내 서재에도 있나요?
        </p>
        <p className='mt-1 text-sm text-text-subtle'>
          『{bookTitle}』을 읽은 리더들과 별점을 책 정보 페이지에서 볼 수
          있어요.
        </p>
        <Link
          href={href}
          className='mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
        >
          책 정보 보고 서재에 담기
        </Link>
      </aside>
    );
  }

  return (
    <div className='grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-line bg-muted p-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5'>
      <BookCover
        {...(book ? toCoverSource(book) : { src: null, fallbackSrc: null })}
        title={bookTitle}
        author={author}
        size='full'
        sizes='96px'
        alt={`${bookTitle} 표지`}
      />
      <div className='flex min-w-0 flex-col gap-1'>
        <p className='text-lg font-semibold text-text-strong'>{bookTitle}</p>
        <p className='text-sm text-text-subtle'>
          {author}
          {book?.publisher && ` · ${book.publisher}`}
        </p>
        {rating > 0 && (
          <p
            className='flex items-center gap-0.5'
            aria-label={`HJ 별점 ${rating}점 / ${RATING_MAX}점`}
          >
            {Array.from({ length: RATING_MAX }, (_, i) => (
              <Star
                key={i}
                aria-hidden='true'
                className={`size-4 ${i < rating ? 'fill-chart-4 text-chart-4' : 'text-line'}`}
              />
            ))}
          </p>
        )}
        <Link
          href={href}
          className='mt-2 self-start rounded-lg border border-line bg-background px-3.5 py-2 text-sm font-medium text-text-strong transition-colors hover:bg-muted'
        >
          책 정보 보기
        </Link>
      </div>
    </div>
  );
};
