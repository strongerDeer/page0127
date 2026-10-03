'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  COACH_TIP_IDS,
  type CoachTipFacts,
  type CoachTipId,
  isCoachTipPending,
  parseDismissedTips,
  pickCoachTip,
  serializeDismissedTips,
} from './coachTips';

// 사용자별로 키를 나눈다 — 공유 기기에서 A가 닫은 팁 때문에 B의 팁이 사라지면 안 된다
// (widgets/visit/VisitReporter.tsx 의 storageKey 와 같은 이유)
const dismissedKey = (userId: string) => `coach-tips-dismissed:${userId}`;
const seenKey = (userId: string) => `coach-tips-seen:${userId}`;

/** 프라이빗 모드·차단 설정이면 저장소 접근이 throw 한다 — 없는 것으로 친다 */
const readTips = (storage: Storage, key: string) => {
  try {
    return parseDismissedTips(storage.getItem(key));
  } catch {
    return new Set<CoachTipId>();
  }
};

const writeTips = (
  storage: Storage,
  key: string,
  tips: ReadonlySet<CoachTipId>
) => {
  try {
    storage.setItem(key, serializeDismissedTips(tips));
  } catch {
    // 저장 못 하면 다음 방문에 다시 뜰 뿐이다 — 화면을 막을 일은 아니다
  }
};

/**
 * 이번 방문에 띄울 코치 팁 하나를 정한다.
 *
 * 두 저장소를 쓴다:
 * - localStorage(닫음) — "알겠어요"를 누른 팁. 다시는 안 뜬다.
 * - sessionStorage(봄)  — 이번 브라우저 세션에 이미 보여준 팁.
 *   그냥 지나친 팁이 페이지를 옮길 때마다 따라다니지 않게 한다.
 *   탭을 닫았다 다시 오면 초기화되어, 아직 안 한 일은 한 번 더 알려 준다.
 *
 * shared/lib/hooks/useLocalStorage 를 쓰지 않는 이유: 그 훅은 하이드레이션 직후
 * 첫 effect 시점에 서버 스냅샷(빈 값)을 돌려줄 수 있다. 판정은 마운트 때 한 번뿐이라
 * 그 순간 닫은 기록을 못 보면 닫은 팁이 다시 뜬다. 그래서 여기서 직접 읽는다.
 *
 * @param hasTarget 이 팁이 가리킬 요소가 지금 화면에 있는가. 없는 팁은 고르지 않는다 —
 *   고른 뒤에 못 띄우면 보여 주지도 않은 팁이 "봄"으로 기록되어 이번 세션에서 사라진다.
 *   매 렌더 바뀌지 않는 함수(모듈 최상위)를 넘길 것.
 */
export const useCoachTip = (
  userId: string,
  facts: CoachTipFacts,
  hasTarget: (id: CoachTipId) => boolean
) => {
  const [tip, setTip] = useState<CoachTipId | null>(null);

  // StrictMode(dev)는 effect 를 두 번 돌린다. 두 번째 판정은 첫 판정이 남긴
  // "봄" 기록 때문에 null 이 되어 방금 고른 팁을 지워 버린다 — 한 번만 정한다.
  const decidedFor = useRef<string | null>(null);

  const { isOwner, bookCount, hasReadingGoal } = facts;
  const { analyzableBookCount, hasTasteAnalysis } = facts;

  useEffect(() => {
    if (decidedFor.current === userId) return;
    decidedFor.current = userId;

    const dismissed = readTips(localStorage, dismissedKey(userId));
    const seen = readTips(sessionStorage, seenKey(userId));
    const noTarget = COACH_TIP_IDS.filter((id) => !hasTarget(id));

    const picked = pickCoachTip({
      isOwner,
      bookCount,
      hasReadingGoal,
      analyzableBookCount,
      hasTasteAnalysis,
      dismissed: new Set([...dismissed, ...seen, ...noTarget]),
    });
    if (!picked) return;

    writeTips(sessionStorage, seenKey(userId), new Set([...seen, picked]));
    // 저장소는 브라우저에만 있어 렌더 중에는 읽을 수 없다 — 마운트 뒤 한 번 정한다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTip(picked);
  }, [
    userId,
    isOwner,
    bookCount,
    hasReadingGoal,
    analyzableBookCount,
    hasTasteAnalysis,
    hasTarget,
  ]);

  /** 이번 방문에만 숨긴다 (바깥 클릭 등) */
  const hide = useCallback(() => setTip(null), []);

  /** 다시는 띄우지 않는다 ("알겠어요") */
  const dismiss = useCallback(() => {
    if (tip) {
      const key = dismissedKey(userId);
      writeTips(
        localStorage,
        key,
        new Set([...readTips(localStorage, key), tip])
      );
    }
    setTip(null);
  }, [tip, userId]);

  // 떠 있는 동안 그 일을 해 버렸으면 바로 거둔다 — 상태를 바꾸지 않고 렌더에서 걸러낸다
  const visibleTip = tip && isCoachTipPending(tip, facts) ? tip : null;

  return { tip: visibleTip, hide, dismiss };
};
