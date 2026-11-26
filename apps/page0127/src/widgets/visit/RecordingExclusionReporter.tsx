'use client';

import { useEffect } from 'react';

import {
  type RecordingPolicy,
  setClarityTag,
  stopClarity,
} from '@/shared/lib/analytics/clarity';
import {
  isAdminDevice,
  markAdminDevice,
} from '@/shared/lib/analytics/MarkAdminDevice';

import { useCurrentUserContext } from '@/entities/user';

/**
 * 로그인한 계정이 운영자(관리자·테스트 계정)면 이 기기를 Clarity 녹화에서 뺀다.
 * 체험 계정이면 녹화는 그대로 두고 demo 태그만 단다 — 리뷰어가 어디서 막히는지는 봐야 하니까.
 *
 * 흐름
 *   1. 로그인이 확인되면(/auth/me) 세션마다 한 번 /api/auth/recording 에 묻는다
 *   2. excluded 면 localStorage 에 운영자 기기 표시를 남긴다
 *      → 다음 페이지 로드부터 clarity-init 이 표시를 보고 스크립트를 아예 붙이지 않는다
 *   3. 이미 이 페이지에서 녹화가 돌고 있으면 stopClarity 로 그 자리에서 멈춘다
 *      (Next.js 는 페이지를 옮겨도 문서를 새로 받지 않아, 멈추지 않으면 새로고침 전까지 계속 녹화된다)
 *
 * 한계: 새 기기에서 로그인하기 전에 본 화면은 녹화될 수 있다. 판정이 로그인에 달려 있어서다.
 *
 * 왜 widgets 인가: VisitReporter 와 같다 — entities/user 를 읽어야 하는데 shared 는 entities 를 못 쓴다.
 */

const ENDPOINT = '/api/auth/recording';

// 사용자별 키 — 공유 기기에서 다른 계정으로 바꿔 로그인하면 다시 묻는다
const checkedKey = (userId: string) => `recording-policy-checked:${userId}`;

export const RecordingExclusionReporter = () => {
  const { currentUser } = useCurrentUserContext();
  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;
    // 이미 운영자 기기면 Clarity 가 붙지 않으니 물어볼 것도 없다
    if (isAdminDevice()) return;
    // 로그인해서 도는 e2e 테스트는 운영 녹화와 상관없다
    if (navigator.webdriver) return;

    const key = checkedKey(userId);
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // 저장소가 막혀 있으면 페이지마다 물어보게 된다 — 응답이 가벼워 감수한다
    }

    let cancelled = false;
    fetch(ENDPOINT, { credentials: 'same-origin' })
      .then((res) => (res.ok ? (res.json() as Promise<RecordingPolicy>) : null))
      .then((policy) => {
        if (cancelled || !policy) return;
        if (policy.excluded) {
          markAdminDevice();
          stopClarity();
        } else if (policy.demo) {
          setClarityTag('account', 'demo');
        }
        try {
          sessionStorage.setItem(key, '1');
        } catch {
          // 무시
        }
      })
      .catch(() => {
        // 네트워크 오류 — 다음 페이지에서 다시 묻는다
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
};
