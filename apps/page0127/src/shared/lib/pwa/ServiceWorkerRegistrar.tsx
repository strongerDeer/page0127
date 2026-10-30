'use client';

import { useEffect } from 'react';

// 설치 창 이벤트(beforeinstallprompt)는 페이지가 뜨자마자 한 번만 온다 — 루트에서 미리 받아 둔다
import './installPrompt';

/**
 * 서비스워커(public/sw.js) 등록 — 화면에 아무것도 그리지 않는다.
 *
 * 서비스워커가 하는 일은 둘뿐이다:
 *   1. 웹푸시를 받아 잠금화면에 띄운다 (푸시는 서비스워커 없이는 받을 수 없다)
 *   2. 홈 화면 앱(standalone)에서 연결이 끊기면 빈 화면 대신 오프라인 안내를 보인다
 * 페이지·API 응답은 캐시하지 않는다 — 로그인 상태가 섞인 화면을 옛날 것으로 보여 줄 위험이 크다.
 *
 * 개발 서버(next dev)에서는 등록하지 않는다. 한 번 등록된 워커는 탭을 닫아도 남아서
 * 코드를 고쳐도 옛 동작이 계속되는 것처럼 보이게 만든다. 로컬에서 푸시를 시험하려면
 * `next build && next start` 로 띄우거나 NEXT_PUBLIC_ENABLE_SW_IN_DEV=true 를 준다.
 */
export const ServiceWorkerRegistrar = () => {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV !== 'true'
    ) {
      return;
    }

    // updateViaCache: 'none' — sw.js 를 HTTP 캐시에서 꺼내지 않고 매번 서버에 묻는다.
    // 배포한 새 워커가 하루씩 늦게 퍼지는 일을 막는다
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error: unknown) => {
        console.error('서비스워커 등록 실패:', error);
      });
  }, []);

  return null;
};
