'use client';

import { useSyncExternalStore } from 'react';

import { toKstDateKey } from '@/shared/lib/date';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { LAST_DRAWN_KEY } from '../model/useDailySentenceDraw';
import { CarrotSvg } from './CarrotSvg';

import styles from './CarrotBookmark.module.css';

type CarrotBookmarkProps = {
  /** 말풍선 문구 — 홈 표지 기본은 "오늘의 문장 뽑기!" */
  label?: string;
  className?: string;
};

const noopSubscribe = () => () => {};

/**
 * 책장 사이에 꽂힌 당근 책갈피 — 오늘의 문장 입구 (HJ 2026-11-24 "뽑기니까 당근")
 *
 * /sentence 랜딩으로 가는 링크다. next/link 가 아니라 <a> 인 이유: 사이트 안 이동이면
 * @modal/(.)sentence 가 가로채 모달로 띄우는데, 홈에서는 모달 대신 랜딩 전체 화면으로 보낸다(HJ 11/24).
 * (서재 배너는 Link 라서 계속 모달로 뜬다 — 뽑자마자 뒤 캘린더에 책갈피가 찍히게)
 *
 * 오늘 이미 뽑았으면(이 브라우저 기록) 당근은 움직이지 않고 말풍선이 "오늘의 문장 보기"로 바뀐다(HJ 11/24).
 * 홈은 모두에게 같은 화면으로 캐시되므로 브라우저가 판단한다 — 서버 HTML 과 첫 렌더는 말풍선 없이,
 * 하이드레이션 뒤에 맞는 문구로 나타난다(문구가 번쩍 바뀌어 보이지 않게).
 */
export const CarrotBookmark = ({
  label = '오늘의 문장 뽑기!',
  className,
}: CarrotBookmarkProps) => {
  const [lastDrawn] = useLocalStorage<string | null>(LAST_DRAWN_KEY, null);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const drawnToday = lastDrawn === toKstDateKey(new Date());

  return (
    // 일부러 <a>: Link 면 @modal/(.)sentence 가 가로채 모달이 뜬다 — 홈은 랜딩 전체 화면으로 보낸다
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href='/sentence'
      className={`${styles.carrot} ${className ?? ''}`}
      data-drawn={drawnToday ? '' : undefined}
      aria-label={drawnToday ? '오늘의 문장 보기' : '오늘의 문장 뽑기'}
    >
      {hydrated && (
        <span aria-hidden='true' className={styles.bubble}>
          {drawnToday ? '오늘의 문장 보기' : label}
        </span>
      )}
      <CarrotSvg className={styles.svg} />
    </a>
  );
};
