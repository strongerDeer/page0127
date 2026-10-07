'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { CoverImage, isPreOptimizedImageSrc, ReadCountBadge } from '@repo/ui';

import { isTopRated, toCoverSource } from '@/entities/book';
import { spineWidthPx } from '@/entities/book/model/spineWidth';

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
          // 책등만 여기서 대체한다 — onError 로 대체된 뒤에는 로컬 이미지(no-book.jpg)가
          // 들어온다. 최적화 여부 판정은 실제로 그릴 src 기준이어야 한다.
          // 표지는 CoverImage 가 YES24 → Storage 사본 → 이미지 없음 순으로 대체한다.
          const renderedSpine = imgSrc[book.id] || book.spine_image;
          // 여러 번 읽은 책은 조금 크게 — 뱃지가 잘 안 보이는 책등에서도
          // "이 책은 다르다"가 실루엣만으로 읽힌다
          const isReread = book.read_count > 1;
          // 이미지가 없는 책등만 두께로 폭을 만든다 (아래 Image 주석 참고)
          const spineWidth = spineWidthPx(book.thickness_mm);

          const noImage = (
            <div
              className={`${styles.noImage} ${isCoverView ? styles.cover : styles.spine}`}
              // 그릴 이미지가 없으니 늘어날 것도 없다 — 여기서는 두께를 폭으로 쓴다
              style={isCoverView ? undefined : { width: `${spineWidth}px` }}
            >
              <p>{book.title}</p>
            </div>
          );

          // width·height 속성은 로딩 전 자리 잡기용 비율 힌트일 뿐이다.
          // 실제 크기는 CSS(`height: 240px; width: auto`)가 정한다 →
          // 높이는 고정, 폭은 이미지 원본 비율을 따른다.
          const imageBox = {
            width: isCoverView ? 170 : 50,
            height: 240,
            sizes: '(max-width: 768px) 170px, 170px',
          };

          return (
            <li key={book.id}>
              <Link
                href={getHref(book)}
                className={isReread ? styles.reread : undefined}
              >
                {isCoverView ? (
                  <CoverImage
                    {...toCoverSource(book)}
                    {...imageBox}
                    alt={book.title}
                    fallback={noImage}
                  />
                ) : renderedSpine ? (
                  <Image
                    src={renderedSpine}
                    {...imageBox}
                    alt={book.title}
                    unoptimized={isPreOptimizedImageSrc(renderedSpine)}
                    onError={() => onError(book.id)}
                    // ⚠️ 책등 이미지에 폭을 강제하지 않는다.
                    // 두께(thickness_mm)로 폭을 고정했던 적이 있다(2026-09-29). 박스가
                    // 원본 비율보다 넓어서 `cover` 는 위아래가 잘리고(평균 55% 손실),
                    // `fill` 은 글자가 옆으로 늘어났다(평균 2.27배). 비율을 지키는 방법은
                    // 폭을 이미지에 맡기는 것뿐이다.
                  />
                ) : (
                  noImage
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
