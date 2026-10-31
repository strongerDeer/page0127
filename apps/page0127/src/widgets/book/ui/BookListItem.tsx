import Image from 'next/image';
import Link from 'next/link';

import { CoverImage, isPreOptimizedImageSrc } from '@repo/ui';

import { toCoverSource } from '@/entities/book';

import { BookCoverPreview } from './BookCoverPreview';
import { BookLikeButton } from './BookLikeButton';

import type { Book, GlobalBook } from '@/entities/book';

import styles from './BookListItem.module.css';

/**
 * 정보 밀도 (00_docs/07 §9 — 서피스별 정보 밀도 분리)
 * - 'default': 표지를 hover하면 책등이 돌아나오며 소개·출판사·카테고리 팝오버가 뜬다.
 *   전체 도서·서재처럼 **비교·탐색**을 파는 면에서 쓴다.
 * - 'compact': 그 미리보기를 그리지 않는다. 랜딩·랭킹처럼 **발견**을 파는 면.
 *   교보 홈 카드가 소개·저자·가격을 감추는 것과 같은 이유 — 발견 면은 감춘다.
 *   표지 flip 자체는 유지한다(우리만의 spineflip 자산, §2-2).
 */
type BookItemVariant = 'default' | 'compact';

type BookItemProps = {
  book: GlobalBook | Book;
  rank?: number;
  isReadProp?: boolean;
  /** 지금 읽는 중 — 책장(책등 뷰)과 같은 책갈피 리본을 표지에 단다 */
  isReadingProp?: boolean;
  isLikedProp?: boolean;
  /**
   * 책 정보 페이지(/books/info/[id])는 이제 공개다 — 상세 링크는 항상 살아 있다.
   * 이 값은 좋아요 버튼에만 쓴다(비로그인이면 로그인으로 유도).
   */
  isLoggedIn?: boolean;
  variant?: BookItemVariant;
};

type BookListItemCoverProps = {
  id: string;
  title: string;
  author: string | null;
  cover: string | null;
  /** cover 를 불러오지 못했을 때 쓸 주소 (Storage 사본) */
  coverFallback?: string | null;
  spine: string | null;
  description: string | null;
  publisher: string | null;
  category: string | null;
  isRead: boolean;
  isReading?: boolean;
  rank?: number;
  variant?: BookItemVariant;
};

type BookListItemContentProps = {
  id: string;
  title: string;
  author: string | null;
  isLiked: boolean;
  isLoggedIn?: boolean;
};

const BookListItemCover = ({
  id,
  title,
  author,
  cover,
  coverFallback,
  spine,
  description,
  publisher,
  category,
  isRead,
  isReading = false,
  rank,
  variant = 'default',
}: BookListItemCoverProps) => {
  const inner = (
    <div className={styles.perspective}>
      <div className={styles.cover}>
        <div className={styles.bookImg}>
          {/* 책등 이미지 — 평소엔 옆으로 90도 누워 있다가 hover 때 앞으로 돈다.
              사파리는 이렇게 누운(화면상 너비 0) lazy 이미지를 "안 보인다"고 보고
              끝까지 불러오지 않는다(2026-10-31, /books/all). 그래서 표지에 포인터·포커스가
              닿는 순간 BookCoverPreview 가 data-spine 이미지를 eager 로 바꿔 불러온다.
              터치 기기는 뒤집기가 없으니 지금처럼 안 받는다. */}
          <div data-spine-face='' className={styles.flipCover}>
            {spine ? (
              <Image
                src={spine}
                alt=''
                width='400'
                height='400'
                data-spine=''
                unoptimized={isPreOptimizedImageSrc(spine)}
              />
            ) : (
              <div className={styles.spineFallback} />
            )}
          </div>

          {/* 앞 표지 — 이미지가 없으면 제목·저자를 조판해 표지를 생성한다
              (기존에는 존재하지 않는 /images/placeholder-cover.png 를 가리켜 깨졌다) */}
          <CoverImage
            src={cover}
            fallbackSrc={coverFallback}
            alt={title}
            width={400}
            height={400}
            fallback={
              <div className={styles.fallback}>
                <p className={styles.fallbackTitle}>{title}</p>
                {author && <p className={styles.fallbackAuthor}>{author}</p>}
              </div>
            }
          />

          {/* 읽음 뱃지 */}
          {isRead && (
            <div className={styles.read}>
              <span className='sr-only'>읽음</span>
            </div>
          )}

          {/* 읽는 중 책갈피 — 완독(접힘)과 같은 오른쪽 위 자리. 둘 다면 완독이 이긴다
              (다시 읽는 중인 책은 이미 완독 표시가 있다) */}
          {isReading && !isRead && (
            <div data-bookmark className={styles.bookmark}>
              <span className='sr-only'>읽는 중</span>
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
    </div>
  );

  return (
    <BookCoverPreview
      id={id}
      title={title}
      description={description}
      publisher={publisher}
      category={category}
      enabled={variant !== 'compact'}
    >
      {inner}
    </BookCoverPreview>
  );
};

const BookListItemContent = ({
  id,
  title,
  author,
  isLiked,
  isLoggedIn,
}: BookListItemContentProps) => (
  <div className={styles.content}>
    <h3 className={styles.title}>
      <Link
        // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
        prefetch={false}
        href={`/books/info/${id}`}
      >
        {title}
      </Link>
    </h3>
    <p className={styles.author}>{author}</p>
    <div className={styles.like}>
      <BookLikeButton
        bookId={id}
        initialLiked={isLiked}
        isLoggedIn={isLoggedIn}
      />
    </div>
  </div>
);

export const BookListItem = ({
  book,
  rank,
  isReadProp,
  isReadingProp,
  isLikedProp,
  isLoggedIn = true,
  variant = 'default',
}: BookItemProps) => {
  const isRead =
    isReadProp ?? ('status' in book && book.status === 'completed');
  const isReading =
    isReadingProp ?? ('status' in book && book.status === 'reading');
  const cover = toCoverSource(book);

  return (
    <article className={styles.article}>
      <BookListItem.Cover
        id={book.id}
        title={book.title}
        author={book.author}
        cover={cover.src}
        coverFallback={cover.fallbackSrc}
        spine={book.spine_image}
        description={book.description}
        publisher={book.publisher}
        category={book.category}
        isRead={isRead}
        isReading={isReading}
        rank={rank}
        variant={variant}
      />
      <BookListItem.Content
        id={book.id}
        title={book.title}
        author={book.author}
        isLiked={isLikedProp ?? false}
        isLoggedIn={isLoggedIn}
      />
    </article>
  );
};

BookListItem.Cover = BookListItemCover;
BookListItem.Content = BookListItemContent;
