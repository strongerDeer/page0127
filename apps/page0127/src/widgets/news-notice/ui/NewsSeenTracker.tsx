'use client';

import { useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { useUnseenNews } from '../model/NewsContext';
import { idsSeenOnPath } from '../model/newsStamps';

/**
 * 페이지를 열면 그곳의 소식을 "봤다"로 남긴다 — 화면엔 아무것도 그리지 않는다.
 * (/updates → 공지 전부, /blog → 책 이야기 전부, /blog/{slug}·필사 페이지 → 그 소식)
 *
 * 셸에 한 번만 둔다. 페이지마다 넣으면 소식 페이지가 늘 때 빼먹기 쉽다.
 * 안 본 소식 중에서만 고르므로, 볼 게 없으면 localStorage 에 쓰지 않는다.
 */
export const NewsSeenTracker = () => {
  const pathname = usePathname();
  const { all, markSeen } = useUnseenNews();

  useEffect(() => {
    markSeen(idsSeenOnPath(pathname, all));
  }, [pathname, all, markSeen]);

  return null;
};
