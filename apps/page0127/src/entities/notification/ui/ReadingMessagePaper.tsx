import Image from 'next/image';

import { BookCover, isPreOptimizedImageSrc } from '@repo/ui';

import type { ReadingEnvelopeKind } from '../model/readingNudge';

import styles from './bookEnvelope.module.css';

export const ReadingMessagePaper = ({
  kind,
  message,
  senderName,
  book,
  bookHref,
  onBookOpen,
}: {
  bookHref?: string | null;
  onBookOpen?: () => void;
  kind: ReadingEnvelopeKind;
  message: string;
  senderName: string;
  book?: {
    title: string;
    author?: string | null;
    cover_image?: string | null;
  } | null;
}) => (
  <div className={`${styles.paper} ${kind === 'note' ? styles.notePaper : ''}`}>
    {kind === 'note' && (
      <Image
        src='/illustrations/reading-note.webp'
        unoptimized={isPreOptimizedImageSrc('/illustrations/reading-note.webp')}
        alt='쪽지 위로 빼꼼 내다보는 작은 말'
        width={420}
        height={379}
        className={styles.peek}
        sizes='138px'
      />
    )}
    <div className={book ? styles.letterBody : undefined}>
      <div>
        <p className={styles.kicker}>
          {kind === 'recommendation'
            ? '너에게 권하는 한 권'
            : kind === 'invitation'
              ? '함께 읽자는 초대'
              : '살짝 두고 간 한마디'}
        </p>
        <blockquote className={styles.message}>{message}</blockquote>
        {book && (
          <section className={styles.bookInfo} aria-label='함께 보낸 책'>
            <p className={styles.bookTitle}>
              {bookHref ? (
                <a
                  href={bookHref}
                  onClick={(event) => {
                    if (
                      onBookOpen &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      onBookOpen();
                    }
                  }}
                  className='hover:underline focus-visible:underline'
                >
                  {book.title}
                </a>
              ) : (
                book.title
              )}
            </p>
            {book.author && <p className={styles.author}>{book.author}</p>}
          </section>
        )}
        <p className={styles.signature}>— {senderName}</p>
      </div>
      {book && (
        <div className={styles.cover}>
          {bookHref ? (
            <a
              className='block rounded-sm focus-visible:outline-2 focus-visible:outline-primary'
              href={bookHref}
              aria-label={`${book.title} 책 정보`}
              onClick={(event) => {
                if (
                  onBookOpen &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  onBookOpen();
                }
              }}
            >
              {' '}
              <BookCover
                src={book.cover_image}
                title={book.title}
                author={book.author}
                size='full'
              />
            </a>
          ) : (
            <BookCover
              src={book.cover_image}
              title={book.title}
              author={book.author}
              size='full'
            />
          )}
        </div>
      )}
    </div>
  </div>
);
