import Image from 'next/image';
import Link from 'next/link';

import { BookLikeButton } from './BookLikeButton';

import type { Book, GlobalBook } from '@/entities/book';

import styles from './BookListItem.module.css';

type BookItemProps = {
  book: GlobalBook | Book;
  rank?: number;
  isReadProp?: boolean;
  isLikedProp?: boolean;
  // 기본 true — 비로그인 노출 화면(랜딩 랭킹)에서만 false로 내려 상세 링크를 끈다
  isLoggedIn?: boolean;
};

type BookListItemCoverProps = {
  id: string;
  title: string;
  author: string | null;
  cover: string | null;
  spine: string | null;
  description: string | null;
  publisher: string | null;
  category: string | null;
  isRead: boolean;
  rank?: number;
  disableLink?: boolean;
};

type BookListItemContentProps = {
  id: string;
  title: string;
  author: string | null;
  isLiked: boolean;
  disableLink?: boolean;
};

const BookListItemCover = ({
  id,
  title,
  author,
  cover,
  spine,
  description,
  publisher,
  category,
  isRead,
  rank,
  disableLink,
}: BookListItemCoverProps) => {
  // 표지 + 부가정보 묶음 — 링크 활성/비활성 양쪽에서 공통으로 쓴다
  const inner = (
    <div className={styles.perspective}>
      <div className={styles.cover}>
        <div className={styles.bookImg}>
          {/* 책등 이미지 */}
          <div className={styles.flipCover}>
            {spine ? (
              <Image src={spine} alt='' width='400' height='400' />
            ) : (
              <div className={styles.spineFallback} />
            )}
          </div>

          {/* 앞 표지 — 이미지가 없으면 제목·저자를 조판해 표지를 생성한다
              (기존에는 존재하지 않는 /images/placeholder-cover.png 를 가리켜 깨졌다) */}
          {cover ? (
            <Image src={cover} alt={title} width='400' height='400' />
          ) : (
            <div className={styles.fallback}>
              <p className={styles.fallbackTitle}>{title}</p>
              {author && <p className={styles.fallbackAuthor}>{author}</p>}
            </div>
          )}

          {/* 읽음 뱃지 */}
          {isRead && (
            <div className={styles.read}>
              <span className='sr-only'>읽음</span>
            </div>
          )}

          {/* 순위 뱃지 (3위 이내) */}
          {rank && rank <= 3 && (
            <div className='absolute -left-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-text-strong text-xs font-bold text-white'>
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
  );

  // 비로그인 등 링크 비활성 시 Link 없이 내용만 (클릭해도 상세로 이동하지 않음)
  if (disableLink) {
    return inner;
  }

  return (
    <Link href={`/books/info/${id}`} title={`${title} 상세 내용 보기`}>
      {inner}
    </Link>
  );
};

const BookListItemContent = ({
  id,
  title,
  author,
  isLiked,
  disableLink,
}: BookListItemContentProps) => (
  <div className={styles.content}>
    <h3 className={styles.title}>
      {disableLink ? title : <Link href={`/books/info/${id}`}>{title}</Link>}
    </h3>
    <p className={styles.author}>{author}</p>
    <div className='mt-2 text-center'>
      <BookLikeButton bookId={id} initialLiked={isLiked} />
    </div>
  </div>
);

export const BookListItem = ({
  book,
  rank,
  isReadProp,
  isLikedProp,
  isLoggedIn = true,
}: BookItemProps) => {
  const isRead =
    isReadProp ?? ('status' in book && book.status === 'completed');

  // 로그인하지 않은 방문자에게는 상세(/books/info) 링크를 비활성화한다
  const disableLink = !isLoggedIn;

  return (
    <article className={styles.article}>
      <BookListItem.Cover
        id={book.id}
        title={book.title}
        author={book.author}
        cover={book.cover_image}
        spine={book.spine_image}
        description={book.description}
        publisher={book.publisher}
        category={book.category}
        isRead={isRead}
        rank={rank}
        disableLink={disableLink}
      />
      <BookListItem.Content
        id={book.id}
        title={book.title}
        author={book.author}
        isLiked={isLikedProp ?? false}
        disableLink={disableLink}
      />
    </article>
  );
};

BookListItem.Cover = BookListItemCover;
BookListItem.Content = BookListItemContent;
