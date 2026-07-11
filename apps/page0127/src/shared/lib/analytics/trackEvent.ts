// GA4 커스텀 이벤트 추적 유틸
// - window.gtag 를 타입 안전하게 감싼다 (GA 미로드/서버 환경이면 조용히 무시)

// gtag 는 GoogleAnalytics.tsx 가 전역에 심는 함수
type GtagFn = (
  command: 'event',
  eventName: string,
  params?: Record<string, unknown>
) => void;

// window.gtag 타입 확장 (any 대신 명시적 타입)
// - 전역 Window 확장은 선언 병합이 필요해 interface 가 필수 (type 으로 불가)
declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    gtag?: GtagFn;
  }
}

// 추적할 이벤트 이름 (오타 방지용 유니온)
export type AnalyticsEvent = 'cta_click' | 'scroll_depth' | 'signup_start';

export const trackEvent = (
  event: AnalyticsEvent,
  params?: Record<string, unknown>
) => {
  // SSR 이거나 GA 미로드 시 no-op
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', event, params);
};
