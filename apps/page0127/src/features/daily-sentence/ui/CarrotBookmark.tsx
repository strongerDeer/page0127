'use client';

import { useSyncExternalStore } from 'react';

import Link from 'next/link';

import { toKstDateKey } from '@/shared/lib/date';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { AUTO_DRAW_KEY, LAST_DRAWN_KEY } from '../model/useDailySentenceDraw';
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
 * /sentence 로 가는 링크 — 사이트 안 이동이면 @modal/(.)sentence 가 가로채 모달을 띄우고,
 * 누를 때 남긴 표시(AUTO_DRAW_KEY)를 보고 모달이 뜨자마자 당근이 뽑혀 책이 펼쳐진다
 * (HJ 11/24: 페이지로 넘어가서 한 번 더 뽑는 건 별로).
 * 새 탭·새로고침이면 /sentence 랜딩 전체 화면이 뜬다. scroll={false}: 모달이 뜰 때 뒤 홈이 맨 위로 튀지 않게.
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
    <Link
      href='/sentence'
      scroll={false}
      onClick={() => {
        if (drawnToday) return;
        try {
          sessionStorage.setItem(AUTO_DRAW_KEY, String(Date.now()));
        } catch {
          // 저장이 막힌 브라우저 — 모달에서 당근을 한 번 더 누르면 된다
        }
      }}
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
    </Link>
  );
};
