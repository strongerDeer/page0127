import { SafeCover } from './SafeCover';

import type { ShelfBook } from '../model/coverRows';

import styles from './CoverMarquee.module.css';

type CoverMarqueeProps = { rows: [ShelfBook[], ShelfBook[]] };

type RowProps = { books: ShelfBook[]; reverse?: boolean };

const Row = ({ books, reverse }: RowProps) => (
  <ul className={`${styles.track} ${reverse ? styles.reverse : ''}`}>
    {[...books, ...books].map((book, i) => (
      // 두 번 이어 붙인 뒷부분은 장식 복제다 — 스크린리더가 같은 책을 두 번 읽지 않게 숨긴다
      <li key={`${book.id}-${i}`} aria-hidden={i >= books.length || undefined}>
        <SafeCover
          src={book.coverImage!}
          fallbackSrc={book.coverFallback}
          alt={i < books.length ? book.title : ''}
          width={116}
          height={174}
          className='aspect-[2/3] w-[84px] rounded-sm object-cover shadow-lg md:w-[116px]'
        />
      </li>
    ))}
  </ul>
);

/** 최근 꽂힌 표지가 두 줄로 반대 방향으로 흐른다. 마우스를 올리면 멈춘다 */
export const CoverMarquee = ({ rows }: CoverMarqueeProps) => (
  <div className={styles.rows}>
    <Row books={rows[0]} />
    <Row books={rows[1]} reverse />
  </div>
);
