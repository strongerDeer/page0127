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

// 키를 사용자별로 나누는 이유: 공유 기기에서 A가 오늘 방문을 보낸 뒤 B가 로그인하면,
// 전역 키로는 B의 방문이 "이미 보냄"으로 걸러져 서버에 아예 도달하지 않는다.
// 서버의 복합 PK는 같은 사용자의 중복만 흡수한다 — 이 경우는 요청 자체가 없다.
const storageKey = (userId: string) => `visit-reported-date:${userId}`;

export const VisitReporter = () => {
  const { currentUser } = useCurrentUserContext();
  const userId = currentUser?.id;

  // React 19 StrictMode(dev 전용)에서는 이 effect가 마운트 시 두 번 돈다 —
  // POST가 2건 나갈 수 있다는 뜻이다. 그래도 module-scope 플래그(예:
  // shared/lib/rum/WebVitalsReporter.tsx의 `started`)로 막지 않는다. 그 패턴은
  // userId가 정당하게 바뀌는 경우(로그아웃 후 다른 계정으로 로그인)에도 재발사를
  // 막아, 공유 기기에서 다음 사용자의 방문이 누락되는 버그를 되살린다 — 그 버그는
  // 위 storageKey를 사용자별 localStorage 키로 분리해 방금 고친 것이다.
  // 서버의 복합 PK (user_id, visit_date)가 같은 사용자의 중복 POST를 1행으로
  // 접어 주므로, StrictMode의 이중 호출은 데이터 관점에서 안전하다.
  useEffect(() => {
    // 비로그인(또는 아직 로딩 중)이면 보낼 것이 없다.
    if (!userId) return;

    // 로그인해서 도는 e2e 테스트(Playwright)가 방문 기록을 오염시키지 않게 막는다.
    // 서버는 UA로 거르지 않는다 — 세션이 있어야 저장되므로 크롤러는 못 온다.
    if (navigator.webdriver) return;

    const today = toKstDateKey(new Date());
    const key = storageKey(userId);

    let reported: string | null = null;
    try {
      reported = localStorage.getItem(key);
    } catch {
      // 프라이빗 모드·차단 설정 — 매번 보내게 되지만 서버 PK가 중복을 흡수한다.
    }
    if (reported === today) return;

    void fetch(ENDPOINT, { method: 'POST' })
      .then((response) => {
        // 네트워크 단계에서 실패하면 저장하지 않는다 → 다음 페이지 이동에서 다시 시도한다.
        // 주의: 서버가 DB 쓰기에 실패해도 /api/visit은 204(= ok)를 돌려준다(의도된 설계).
        // 즉 이 분기는 **서버 쪽 저장 실패를 잡지 못한다.** 그쪽은 서버 로그로 확인한다.
        if (!response.ok) return;
        try {
          localStorage.setItem(key, today);
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
