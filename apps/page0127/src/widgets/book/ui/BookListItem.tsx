'use client';

import Link from 'next/link';

import styles from './BookListItem.module.css';
import LikeButton from './LikeButton';
import type { GlobalBook, Book } from '@/entities/book/types';

// Union type to handle both GlobalBook and User Book
type BookItemProps = {
  book: GlobalBook | Book;
  rank?: number; // Optional ranking
  isReadProp?: boolean; // Prop to override read status
  isLikedProp?: boolean; // Prop for like status
};

export default function BookListItem({ book, rank, isReadProp, isLikedProp }: BookItemProps) {
  // Common fields mapping
  const id = book.id;
  const title = book.title;
  const author = book.author;
  const description = book.description;
  const cover = book.cover_image;
  const publisher = book.publisher;
  const category = book.category;

  // Logic for spine/flip cover
  // Check if spine_image exists on the book object (GlobalBook now has it too)
  const spine = (book as any).spine_image;

  // Determine if read based on status or specific prop
  const isRead = isReadProp || (book as any).status === 'completed';

  return (
    <article className={styles.article}>
      <Link href={`/books/info/${id}`} title={`${title} 상세 내용 보기`}>
        <div className={styles.perspective}>
          <div className={styles.cover}>
            <div className={styles.bookImg}>
              {/* Spine/Back Cover (Side view) */}
              <div className={styles.flipCover}>
                {spine ? (
                   <img
                    src={spine}
                    alt=""
                   />
                ) : (
                   /* Fallback spine if no image */
                   <div style={{
                       width: '100%',
                       height: '100%',
                       backgroundColor: '#e5e7eb', // gray-200
                       borderRight: '1px solid #d1d5db' // gray-300
                   }} />
                )}
              </div>

              {/* Front Cover */}
             <img
                src={cover || '/images/placeholder-cover.png'}
                alt={title}
              />

              {/* Read Badge (Folded Corner) */}
              {isRead && (
                <div className={styles.read}>
                  <span className="sr-only">읽음</span>
                </div>
              )}

               {/* Rank Badge */}
               {rank && rank <= 3 && (
                <div className="absolute -left-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-white shadow-md">
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

      <div className={styles.content}>
        <h3 className={styles.title}>
          <Link href={`/books/info/${id}`}>
            {title}
          </Link>
        </h3>
        <p className={styles.author}>{author}</p>

        {/* Like Button */}
        <div className="mt-2 text-center">
            <LikeButton bookId={id} initialLiked={isLikedProp || false} />
        </div>
      </div>
    </article>
  );
}
