import Image from 'next/image';

import type { ReadingEnvelopeKind } from '../model/readingNudge';

import styles from './bookEnvelope.module.css';

export const BookEnvelopeArtwork = ({
  kind = 'recommendation',
  caption,
  compact = false,
  hasBook = true,
  opened = false,
}: {
  kind?: ReadingEnvelopeKind;
  caption?: string;
  compact?: boolean;
  hasBook?: boolean;
  opened?: boolean;
}) => (
  <div
    className={`${styles.artwork} ${compact ? styles.thumbnail : ''} ${opened ? styles.blend : ''}`}
  >
    <Image
      src={
        kind === 'invitation'
          ? '/illustrations/reading-invitation.webp'
          : '/illustrations/book-envelope-v2.webp'
      }
      alt={
        kind === 'invitation'
          ? '친구를 살며시 깨우며 함께 책을 읽자고 조르는 작은 말'
          : '책과 와인을 서빙하는 작은 말 웨이터와 파란 책 봉투'
      }
      width={1200}
      height={900}
      sizes={compact ? '96px' : '(max-width: 640px) 100vw, 480px'}
      className={styles.image}
      loading={compact ? 'lazy' : 'eager'}
    />
    {!compact && (
      <div className={styles.heading}>
        <p className={styles.headline}>
          저쪽 책장 주인께서
          <br />
          {kind === 'invitation'
            ? '같이 읽자고 하시네요.'
            : hasBook
              ? '한 권 보내셨습니다.'
              : '한마디 보내셨습니다.'}
        </p>
        <hr className={styles.rule} />
        {caption && <p className={styles.caption}>{caption}</p>}
      </div>
    )}
  </div>
);
