'use client';

import Link from 'next/link';

import { LikeButton } from './LikeButton';

import type { Book, GlobalBook } from '@/entities/book/types';

import styles from './BookListItem.module.css';

type BookItemProps = {
  book: GlobalBook | Book;
  rank?: number;
  isReadProp?: boolean;
  isLikedProp?: boolean;
};

type BookListItemCoverProps = {
  id: string;
  title: string;
  cover: string | null;
  spine: string | null;
  description: string | null;
  publisher: string | null;
  category: string | null;
  isRead: boolean;
  rank?: number;
};

type BookListItemContentProps = {
  id: string;
  title: string;
  author: string | null;
  isLiked: boolean;
};

const BookListItemCover = ({
  id,
  title,
  cover,
  spine,
  description,
  publisher,
  category,
  isRead,
  rank,
}: BookListItemCoverProps) => (
  <Link href={`/books/info/${id}`} title={`${title} 상세 내용 보기`}>
    <div className={styles.perspective}>
      <div className={styles.cover}>
        <div className={styles.bookImg}>
          {/* 책등 이미지 */}
          <div className={styles.flipCover}>
            {spine ? (
              <img src={spine} alt='' />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#e5e7eb',
                  borderRight: '1px solid #d1d5db',
                }}
              />
            )}
          </div>

          {/* 앞 표지 */}
          <img src={cover || '/images/placeholder-cover.png'} alt={title} />

          {/* 읽음 뱃지 */}
          {isRead && (
            <div className={styles.read}>
              <span className='sr-only'>읽음</span>
            </div>
          )}

          {/* 순위 뱃지 (3위 이내) */}
          {rank && rank <= 3 && (
            <div className='absolute -left-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-white shadow-md'>
              {rank}
            </div>
          )}
        </div>
      </div>

      <div className={styles.addCon}>
        <p className={styles.description}>
          {description || '책 소개가 없습니다.'}
        </p>
        {publisher && <p className={styles.publisher}>{publisher}</p>}
        {category && <p className={styles.publisher}>{category}</p>}
      </div>
    </div>
  </Link>
);

const BookListItemContent = ({
  id,
  title,
  author,
  isLiked,
}: BookListItemContentProps) => (
  <div className={styles.content}>
    <h3 className={styles.title}>
      <Link href={`/books/info/${id}`}>{title}</Link>
    </h3>
    <p className={styles.author}>{author}</p>
    <div className='mt-2 text-center'>
      <LikeButton bookId={id} initialLiked={isLiked} />
    </div>
  </div>
);

export const BookListItem = ({
  book,
  rank,
  isReadProp,
  isLikedProp,
}: BookItemProps) => {
  const isRead =
    isReadProp ?? ('status' in book && book.status === 'completed');

  return (
    <article className={styles.article}>
      <BookListItem.Cover
        id={book.id}
        title={book.title}
        cover={book.cover_image}
        spine={book.spine_image}
        description={book.description}
        publisher={book.publisher}
        category={book.category}
        isRead={isRead}
        rank={rank}
      />
      <BookListItem.Content
        id={book.id}
        title={book.title}
        author={book.author}
        isLiked={isLikedProp ?? false}
      />
    </article>
  );
};

BookListItem.Cover = BookListItemCover;
BookListItem.Content = BookListItemContent;
