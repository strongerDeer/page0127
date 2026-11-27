'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { addSeenIds, pickUnseen } from './newsStamps';

import type { NewsStamp } from './newsStamps';

/**
 * 최근 소식을 셸 전체(상단 바·☰·하단 탭·서재 카드)에 나눠 주는 컨텍스트.
 *
 * 왜 props 가 아니라 컨텍스트인가: 같은 목록을 GnbNav·TocMenu·BottomTabBar·서재 카드가 모두 쓴다.
 * 서재 카드는 페이지 안쪽(children) 깊숙이 있어서 레이아웃에서 props 로 닿을 수 없다.
 */
const NewsStampsContext = createContext<NewsStamp[]>([]);

export const NewsProvider = ({
  stamps,
  children,
}: {
  stamps: NewsStamp[];
  children: React.ReactNode;
}) => (
  <NewsStampsContext.Provider value={stamps}>
    {children}
  </NewsStampsContext.Provider>
);

/** 이 기기에서 이미 본 소식 id 목록 — localStorage */
export const NEWS_SEEN_STORAGE_KEY = 'page0127:news-seen';

/** 기본값은 모듈 상수 — 스냅샷이 매번 새 배열이면 useSyncExternalStore 가 무한 렌더한다 */
const EMPTY_SEEN: string[] = [];

const subscribeNothing = () => () => {};

/** 브라우저에서 처음 읽은 시각 — 14일 판정은 날 단위라 한 번 정해 두고 계속 쓴다 */
let clientNow: number | null = null;
const getClientNow = () => (clientNow ??= Date.now());

/**
 * 지금 시각(브라우저에서만). 서버·하이드레이션 중엔 null.
 *
 * 왜 null 인가: 서버 HTML 엔 localStorage 가 없다. 서버에서 "본 것 없음"으로 점을 그리면
 * 이미 본 사람에게도 점이 잠깐 보였다 사라진다(깜빡임). 그래서 점·카드는 브라우저에서만 그린다.
 * 렌더 중 Date.now() 를 부르면 렌더마다 값이 달라지므로(순수성 위반) 외부 저장소처럼 읽는다.
 */
const useClientNow = () =>
  useSyncExternalStore(subscribeNothing, getClientNow, () => null);

export type UnseenNews = {
  /** 아직 안 본 최근 소식(최신순). 하이드레이션 전엔 빈 배열 */
  all: NewsStamp[];
  updates: number;
  stories: number;
  markSeen: (ids: string[]) => void;
};

export const useUnseenNews = (): UnseenNews => {
  const stamps = useContext(NewsStampsContext);
  const now = useClientNow();
  const [seenIds, setSeenIds] = useLocalStorage<string[]>(
    NEWS_SEEN_STORAGE_KEY,
    EMPTY_SEEN
  );

  const all = useMemo(
    () => (now === null ? [] : pickUnseen(stamps, seenIds, now)),
    [now, stamps, seenIds]
  );

  const markSeen = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setSeenIds((prev) => addSeenIds(prev, ids));
    },
    [setSeenIds]
  );

  return {
    all,
    updates: all.filter((stamp) => stamp.kind === 'update').length,
    stories: all.filter((stamp) => stamp.kind === 'story').length,
    markSeen,
  };
};

/** 소식 원본(본 것 판정 없이) — 페이지를 열 때 "봤다"로 칠 id 를 고르는 데 쓴다 */
export const useNewsStamps = () => useContext(NewsStampsContext);
