import Image from 'next/image';

import styles from './bookEnvelope.module.css';

export const BookEnvelopeArtwork = ({
  caption,
  compact = false,
  hasBook = true,
  opened = false,
}: {
  caption?: string;
  compact?: boolean;
  hasBook?: boolean;
  opened?: boolean;
}) => (
  <div
    className={`${styles.artwork} ${compact ? styles.thumbnail : ''} ${opened ? styles.blend : ''}`}
  >
    <Image
      src='/illustrations/book-envelope-v2.webp'
      alt='책과 와인을 서빙하는 작은 말 웨이터와 파란 책 봉투'
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
          {hasBook ? '한 권 보내셨습니다.' : '한마디 보내셨습니다.'}
        </p>
        <hr className={styles.rule} />
        {caption && <p className={styles.caption}>{caption}</p>}
      </div>
    )}
  </div>
);
