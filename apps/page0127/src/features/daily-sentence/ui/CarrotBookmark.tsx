import Link from 'next/link';

import { CarrotSvg } from './CarrotSvg';

import styles from './CarrotBookmark.module.css';

type CarrotBookmarkProps = {
  /** 말풍선 문구 — 홈 표지 기본은 "오늘의 문장 뽑기!" */
  label?: string;
  className?: string;
};

/**
 * 책장 사이에 꽂힌 당근 책갈피 — 오늘의 문장 입구 (HJ 2026-11-24 "뽑기니까 당근")
 *
 * 서버 컴포넌트. 그냥 /sentence 로 가는 링크다 — 사이트 안에서 누르면 @modal/(.)sentence 가 가로채 모달로,
 * 새 탭·새로고침이면 전체 페이지로 열린다. scroll={false}: 모달이 뜰 때 뒤 화면이 맨 위로 튀지 않게.
 *
 * 그림은 CarrotSvg. 부모(.book 등)의 위쪽 모서리에 절대 위치로 꽂힌다.
 */
export const CarrotBookmark = ({
  label = '오늘의 문장 뽑기!',
  className,
}: CarrotBookmarkProps) => (
  <Link
    href='/sentence'
    scroll={false}
    className={`${styles.carrot} ${className ?? ''}`}
    aria-label='오늘의 문장 뽑기'
  >
    <span aria-hidden='true' className={styles.bubble}>
      {label}
    </span>
    <CarrotSvg className={styles.svg} />
  </Link>
);
