'use client';

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
 * 학습 포인트 — React Compiler (Day 65)
 *
 * 원래 이 컴포넌트는 React.memo로 감싸 부모(DashboardBookList)의 잦은 리렌더
 * (검색·필터·정렬)에서 같은 책의 리렌더를 건너뛰게 했다.
 *
 * 이제 next.config.ts의 reactCompiler: true가 켜져 있어, Compiler가 빌드 타임에
 * 자동으로 메모이제이션을 삽입한다 → 손으로 쓴 memo()·displayName이 불필요해져 제거.
 * 컴포넌트를 별도로 "추출한 구조"는 그대로 자산으로 남는다.
 *
 * ⚠️ Compiler가 동작하려면 props가 순수·불변이어야 한다. 부모가 book을
 *    spread({...book})로 복사하거나 렌더 중 변형하면 Compiler가 bail out한다.
 */
export const BookGridItem = ({ book, href }: BookGridItemProps) => {
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
          // 표지 이미지가 없는 책 — 제목을 조판해 표지를 만든다
          <div className='flex h-full w-full flex-col justify-between bg-sunken px-2 py-2.5 text-left'>
            <p className='line-clamp-4 break-keep text-[11px] font-bold leading-snug text-text-strong'>
              {book.title}
            </p>
            {book.author && (
              <p className='line-clamp-1 text-[10px] text-text-faint'>
                {book.author}
              </p>
            )}
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
};
