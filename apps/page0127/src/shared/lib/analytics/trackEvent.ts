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

/**
 * 추적할 이벤트 이름 (오타 방지용 유니온)
 *
 * 깔때기 순서로 적는다. 지금까지는 랜딩의 cta_click·signup_start 둘뿐이라
 * "들어와서 버튼을 눌렀다"까지만 알고 **그 뒤로 무엇을 했는지 몰랐다.**
 * 이 서비스의 활성화는 첫 책을 꽂고 완독을 찍는 순간인데, 그 두 지점이 계측
 * 밖에 있었다.
 *
 *   랜딩    cta_click · signup_start
 *   활성화  book_add → book_complete      ← 비어 있던 구간
 *   차별화  taste_analysis_run
 *   확산    share_click
 *
 * ⚠️ 이름을 바꾸면 GA4 에 쌓인 과거 데이터와 이어지지 않는다. 새 이름은 새 이벤트다.
 */
export type AnalyticsEvent =
  | 'cta_click'
  | 'scroll_depth'
  | 'signup_start'
  /** 책을 서재에 담았다. status 로 어떤 상태로 담았는지 함께 본다 */
  | 'book_add'
  /** 완독으로 **전환**됐다. 이미 완독인 책을 다시 저장한 것은 세지 않는다 */
  | 'book_complete'
  /** AI 취향 분석을 실행했다 */
  | 'taste_analysis_run'
  /** 공유를 눌렀다. method 로 네이티브 공유/링크 복사를 구분한다 */
  | 'share_click';

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
