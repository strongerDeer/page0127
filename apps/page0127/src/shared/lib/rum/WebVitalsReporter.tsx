'use client';

import { useEffect } from 'react';

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution';

import { pickAttribution } from './attribution';
import { getRumSessionId } from './session';

import type { RumMetricName } from '@repo/quality/rum';
import type { Metric } from 'web-vitals';

/**
 * 자체 RUM 수집기 — 실사용자 Core Web Vitals를 /api/rum으로 보낸다.
 *
 * CrUX가 트래픽 임계 미달로 영영 비어 있는 문제를 메우려고 직접 잰다.
 * 판단 근거: apps/page0127/docs/rum-field-metrics.md
 *
 * 화면에 아무것도 그리지 않는다(effect 전용). GoogleAnalytics와 같은 자리다.
 */

const ENDPOINT = '/api/rum';

// 지표 5종이 전부라 큐가 이보다 커질 일은 거의 없다. 넘으면 즉시 흘려보내
// 메모리가 무한정 늘지 않게 한다.
const MAX_QUEUE = 8;

type QueuedSample = {
  path: string;
  metric: RumMetricName;
  value: number;
  rating: Metric['rating'];
  id: string;
  navigationType: Metric['navigationType'];
  attribution?: Record<string, string | number>;
};

// 모듈 스코프 — React 19 StrictMode가 effect를 두 번 돌려도 리스너·콜백이
// 중복 등록되지 않게 한다(중복되면 같은 지표가 두 번 큐에 쌓인다).
let started = false;

const send = (samples: QueuedSample[], sessionId: string): void => {
  if (samples.length === 0) return;
  const body = JSON.stringify({ sessionId, samples });

  // sendBeacon은 페이지가 사라지는 중에도 전송이 보장된다. fetch는 언로드 시
  // 취소될 수 있어 CLS·INP처럼 **마지막에 확정되는 지표를 통째로 잃는다.**
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon(ENDPOINT, blob)) return;
  } catch {
    // sendBeacon이 없거나 실패 → 아래 fetch로 물러난다.
  }
  // keepalive: 문서가 닫혀도 요청을 살려 둔다(sendBeacon의 대체재).
  void fetch(ENDPOINT, { body, method: 'POST', keepalive: true }).catch(() => {
    // 수집 실패가 사용자 경험을 건드리면 안 된다 — 조용히 포기한다.
  });
};

export const WebVitalsReporter = () => {
  useEffect(() => {
    if (started) return;

    // 자동화 브라우저(Playwright e2e·Lighthouse)는 실사용자가 아니다. 서버에서도
    // UA로 거르지만, 헤드리스가 아닌 자동화는 UA만으로 안 걸려서 여기서도 막는다.
    if (navigator.webdriver) return;

    started = true;
    const sessionId = getRumSessionId();
    let queue: QueuedSample[] = [];

    const flush = () => {
      // splice로 비우면서 꺼낸다 — flush가 두 번 불려도 같은 샘플을 두 번 보내지 않는다.
      send(queue.splice(0, queue.length), sessionId);
    };

    const enqueue = (metric: RumMetricName) => (report: Metric) => {
      queue.push({
        // 지표가 보고된 **그 시점의** 경로. LCP·FCP·TTFB는 최초 로드지만
        // CLS·INP는 클라이언트 라우팅 뒤에 확정될 수 있다.
        path: window.location.pathname,
        metric,
        value: report.value,
        rating: report.rating,
        id: report.id,
        navigationType: report.navigationType,
        attribution: pickAttribution(
          metric,
          (report as Metric & { attribution?: unknown }).attribution
        ),
      });
      if (queue.length >= MAX_QUEUE) flush();
    };

    onLCP(enqueue('lcp'));
    onINP(enqueue('inp'));
    onCLS(enqueue('cls'));
    onFCP(enqueue('fcp'));
    onTTFB(enqueue('ttfb'));

    // 'hidden'이 신뢰할 수 있는 유일한 종료 신호다. 모바일에서는 'unload'가
    // 아예 안 불릴 수 있어서, 탭 전환·앱 전환 시점에 보내 둔다.
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    // bfcache로 들어가는 경우 visibilitychange가 안 오는 브라우저가 있어 함께 건다.
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flush);
      // 언마운트(라우팅이 아니라 실제 해제) 시 남은 것을 흘려보낸다.
      flush();
      queue = [];
      started = false;
    };
  }, []);

  return null;
};
