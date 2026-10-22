'use client';

import { useEffect } from 'react';

/**
 * 앱 아이콘 숫자(Badging API)를 읽지 않은 알림 수에 맞춘다.
 *
 * 푸시를 받을 때는 서비스워커가 숫자를 올리고(public/sw.js), 내리는 건 여기서 한다 —
 * 알림을 읽거나 지우면 unreadCount 가 바뀌고 그 값으로 다시 맞춘다.
 *
 * 설치한 앱(데스크톱 크롬 '앱 설치', iOS 홈 화면 앱)에서만 보이고,
 * 지원하지 않는 브라우저(파이어폭스 등)에서는 아무 일도 하지 않는다.
 */
export function useAppBadge(count: number | undefined) {
  useEffect(() => {
    if (count === undefined || !('setAppBadge' in navigator)) return;

    const update =
      count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    // 권한이 없거나 설치 앱이 아니면 거절된다 — 화면에는 영향이 없으므로 삼킨다
    update.catch(() => {});
  }, [count]);
}
