'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';

import { isTopRated } from '@/entities/book';

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
  /** 대시보드처럼 카드 안에 들어갈 때 사용하는 조밀한 선반 */
  compact?: boolean;
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
  compact = false,
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
      <div className='rounded-2xl bg-sunken p-12 text-center'>
        <p className='text-text-body'>조건에 맞는 책이 없어요.</p>
      </div>
    );
  }

  return (
    <div className={`${styles.shelf} ${compact ? styles.compact : ''}`}>
      <ul className={styles.books}>
        {books.map((book) => {
          // 최고 평가(5점·인생책)만 표지를 크게 세우고 나머지는 책등으로 꽂는다
          const isCoverView = isTopRated(book.rating, book.is_life_book);
          const imageUrl = isCoverView ? book.cover_image : book.spine_image;
          const hasImage = !!imageUrl;
          // 여러 번 읽은 책은 조금 크게 — 뱃지가 잘 안 보이는 책등에서도
          // "이 책은 다르다"가 실루엣만으로 읽힌다
          const isReread = book.read_count > 1;

          return (
            <li key={book.id}>
              <Link
                href={getHref(book)}
                className={isReread ? styles.reread : undefined}
              >
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

                {/* 회독 뱃지. 표지는 자리가 있어 "n회독"을 그대로 쓰고,
                    책등(50px)은 숫자만 원형으로 얹는다 */}
                {isReread &&
                  (isCoverView ? (
                    <ReadCountBadge
                      readCount={book.read_count}
                      size='sm'
                      className={`${styles.readCount} bg-primary text-primary-foreground shadow-sm`}
                    />
                  ) : (
                    <span
                      className={`${styles.readCountSpine} bg-primary text-primary-foreground shadow-sm`}
                    >
                      <span aria-hidden='true'>{book.read_count}</span>
                      <span className='sr-only'>{book.read_count}회독</span>
                    </span>
                  ))}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
