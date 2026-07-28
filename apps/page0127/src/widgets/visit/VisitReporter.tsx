'use client';

import { useEffect } from 'react';

import { toKstDateKey } from '@/shared/lib/date';

import { useCurrentUserContext } from '@/entities/user';

/**
 * 방문 기록 수집기 — 로그인 사용자의 "오늘 왔다"를 하루 한 번 /api/visit 으로 보낸다.
 *
 * 재방문율(W1/W4)은 지금부터 적재하지 않으면 소급 계산이 불가능하다.
 * 판단 근거: docs/superpowers/specs/2026-07-28-visit-log-and-rating-split-design.md
 *
 * 화면에 아무것도 그리지 않는다(effect 전용). 단 WebVitalsReporter 와 달리
 * **CurrentUserProvider 안쪽**에 마운트해야 한다 — 로그인 상태를 읽기 때문이다.
 *
 * 왜 shared가 아니라 widgets인가: 로그인 사용자 식별이 필요해 entities/user를
 * import해야 하는데, 이 레포의 FSD 린트 규칙(import/no-restricted-paths)이
 * shared → entities import를 금지한다. widgets는 entities를 자유롭게 쓸 수
 * 있는 레이어라 여기로 옮겼다(다른 widgets/* 도 이미 entities를 그렇게 쓴다).
 */

const ENDPOINT = '/api/visit';
const STORAGE_KEY = 'visit-reported-date';

export const VisitReporter = () => {
  const { currentUser } = useCurrentUserContext();
  const userId = currentUser?.id;

  useEffect(() => {
    // 비로그인(또는 아직 로딩 중)이면 보낼 것이 없다.
    if (!userId) return;

    // 로그인해서 도는 e2e 테스트(Playwright)가 방문 기록을 오염시키지 않게 막는다.
    // 서버는 UA로 거르지 않는다 — 세션이 있어야 저장되므로 크롤러는 못 온다.
    if (navigator.webdriver) return;

    const today = toKstDateKey(new Date());

    let reported: string | null = null;
    try {
      reported = localStorage.getItem(STORAGE_KEY);
    } catch {
      // 프라이빗 모드·차단 설정 — 매번 보내게 되지만 서버 PK가 중복을 흡수한다.
    }
    if (reported === today) return;

    void fetch(ENDPOINT, { method: 'POST' })
      .then((response) => {
        // 실패하면 저장하지 않는다 → 다음 페이지 이동에서 다시 시도한다.
        if (!response.ok) return;
        try {
          localStorage.setItem(STORAGE_KEY, today);
        } catch {
          // 저장 실패는 무시 — 오늘 한 번 더 보낼 뿐이고 서버가 중복을 흡수한다.
        }
      })
      .catch(() => {
        // 수집 실패가 사용자 경험을 건드리면 안 된다 — 조용히 포기한다.
      });
  }, [userId]);

  return null;
};
