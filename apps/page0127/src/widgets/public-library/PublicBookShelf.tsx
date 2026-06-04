'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book';

import styles from './PublicBookShelf.module.css';

type PublicBookShelfProps = {
  books: Book[];
  /** 책 클릭 시 이동할 URL
   *  - 공개서재: `/${username}/${book.id}`
   *  - 대시보드: `/books/${book.id}` (기본값)
   */
  bookHref?: (book: Book) => string;
  username?: string;
};

/**
 * 책장(선반) 렌더러
 *
 * 학습 포인트:
 * - 필터 로직은 DashboardBookList가 담당
 * - 이 컴포넌트는 렌더링만 — 단일 책임 원칙
 * - rating 5점: 표지(cover_image), 나머지: 책등(spine_image)
 */
export const PublicBookShelf = ({
  books,
  bookHref,
  username,
}: PublicBookShelfProps) => {
  const [imgSrc, setImgSrc] = useState<Record<string, string>>({});

  const getHref = (book: Book) => {
    if (bookHref) return bookHref(book);
    if (username) return `/${username}/${book.id}`;
    return `/books/${book.id}`;
  };

  const onError = (bookId: string) => {
    setImgSrc((prev) => ({ ...prev, [bookId]: '/images/no-book.jpg' }));
  };

  if (books.length === 0) {
    return (
      <div className='rounded-lg border border-border bg-muted/50 p-12 text-center'>
        <p className='text-muted-foreground'>조건에 맞는 책이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.shelf}>
      <ul className={styles.books}>
        {books.map((book) => {
          const isCoverView = book.rating === 5 || book.rating === 10;
          const imageUrl = isCoverView ? book.cover_image : book.spine_image;
          const hasImage = !!imageUrl;

          return (
            <li key={book.id}>
              <Link href={getHref(book)}>
                {hasImage ? (
                  <Image
                    src={imgSrc[book.id] || imageUrl}
                    alt={book.title}
                    width={isCoverView ? 170 : 50}
                    height={240}
                    sizes='(max-width: 768px) 170px, 170px'
                    onError={() => onError(book.id)}
                  />
                ) : (
                  <div
                    className={`${styles.noImage} ${isCoverView ? styles.cover : styles.spine}`}
                  >
                    <p>{book.title}</p>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
