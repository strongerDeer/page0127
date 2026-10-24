// GA4 커스텀 이벤트 추적 유틸
// - window.gtag 를 타입 안전하게 감싼다 (GA 미로드/서버 환경이면 조용히 무시)

import { readHeroVariantFromCookieString } from '@/shared/lib/experiment/heroVariant';

// gtag 는 GoogleAnalytics.tsx 가 전역에 심는 함수
type GtagFn = {
  (command: 'event', eventName: string, params?: Record<string, unknown>): void;
  (
    command: 'set',
    target: 'user_properties',
    params: Record<string, unknown>
  ): void;
};

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
 *   랜딩    cta_click · signup_start · shelf_preview_view → shelf_preview_pick → shelf_preview_save | shelf_preview_goal
 *   로그인  login_start                     ← 맛보기 저장 뒤 로그인 화면에서 떠났는지 가른다
 *   가입    sign_up                         ← signup_start 는 클릭일 뿐, 이건 온보딩 완료
 *   담기    shelf_preview_claim             ← 맛보기 보관분이 서재에 들어갔다 (book_add 는 /books/add 에서만 나간다)
 *   활성화  book_add → book_complete      ← 비어 있던 구간
 *   차별화  taste_analysis_run
 *   확산    share_click
 *
 * ⚠️ 이름을 바꾸면 GA4 에 쌓인 과거 데이터와 이어지지 않는다. 새 이름은 새 이벤트다.
 */
export type AnalyticsEvent =
  | 'cta_click'
  /** 홈 맛보기 히어로를 봤다(마운트 한 번) — 맛보기 깔때기의 분모 */
  | 'shelf_preview_view'
  /** 홈 맛보기에서 책을 골랐다. source: 'picks' | 'search', count: 고른 뒤 권수 */
  | 'shelf_preview_pick'
  /** 맛보기 [책장 저장하기] — 로그인으로 간다. count: 고른 권수, source: shelf(책장 아래 버튼)·bar(모바일 하단 바) */
  | 'shelf_preview_save'
  /** 맛보기 0권 [목표 저장하기] — 로그인으로 간다. target: 목표 권수 */
  | 'shelf_preview_goal'
  | 'scroll_depth'
  | 'signup_start'
  /** 로그인 화면에서 소셜 로그인 버튼을 눌렀다. method: 공급자(google·kakao) */
  | 'login_start'
  /**
   * 로그인 뒤 맛보기 보관분이 서재에 담겼다(PendingShelfClaimer).
   * added·skipped·failed: 권수, goal_set: 올해 목표를 정했는지,
   * life_book: 히어로 B 에서 찾은 인생책이 들어 있었는지,
   * asked: 바로 이어진 로그인이 아니라 "담을까요?"를 물은 뒤 담았는지
   */
  | 'shelf_preview_claim'
  /**
   * 로그인 뒤 "로그인 전에 고른 책을 담을까요?"에서 담지 않았다(공용 PC 대비 확인).
   * count: 보관분 권수, goal: 목표가 들어 있었는지
   */
  | 'shelf_preview_decline'
  /**
   * 담기 직후 "언제 읽고 어땠나요?"에 답했다(CompletedYearDialog).
   * asked: 물어본 권수, answered: 연도나 별점을 하나라도 남긴 권수(건너뛰면 0),
   * rated: 그중 별점을 남긴 권수
   */
  | 'shelf_preview_years'
  /**
   * 서재의 "별점만 남기면 취향 분석" 창에서 저장했다(QuickRatingDialog).
   * asked: 보여 준 권수, rated: 별점을 남긴 권수
   */
  | 'rating_nudge_save'
  /**
   * 가입을 끝냈다(온보딩 완료). GA4 권장 이벤트 이름이다.
   * method: 로그인 공급자(google·kakao). 보내는 곳은 SignupTracker
   */
  | 'sign_up'
  /** 책을 서재에 담았다. status 로 어떤 상태로 담았는지 함께 본다 */
  | 'book_add'
  /** 완독으로 **전환**됐다. 이미 완독인 책을 다시 저장한 것은 세지 않는다 */
  | 'book_complete'
  /** AI 취향 분석을 실행했다 */
  | 'taste_analysis_run'
  /** 공유를 눌렀다. method 로 네이티브 공유/링크 복사를 구분한다 */
  | 'share_click';

// 사용자 속성은 페이지(문서)마다 한 번만 설정하면 이후 이벤트에 붙는다
let experimentPropertiesSet = false;

/**
 * 실험 그룹을 GA 사용자 속성으로 남긴다 — 첫 이벤트를 보내기 **직전에**.
 *
 * 레이아웃의 컴포넌트에서 따로 설정하면 늦는다: React 는 자식 effect 를 부모보다 먼저
 * 돌려서, 페이지 안의 shelf_preview_view 가 그룹 없이("(not set)") 먼저 나간다.
 * 그룹을 비교할 이벤트 대부분(login_start·sign_up·shelf_preview_claim)이 홈이 아닌
 * 로그인·온보딩·서재에서 나므로, 이벤트 파라미터가 아니라 사용자 속성으로 둔다.
 */
const setExperimentProperties = (gtag: GtagFn) => {
  if (experimentPropertiesSet) return;
  experimentPropertiesSet = true;
  const heroVariant = readHeroVariantFromCookieString(document.cookie);
  if (heroVariant) {
    gtag('set', 'user_properties', { hero_variant: heroVariant });
  }
};

export const trackEvent = (
  event: AnalyticsEvent,
  params?: Record<string, unknown>
) => {
  // SSR 이거나 GA 미로드 시 no-op
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  setExperimentProperties(window.gtag);
  window.gtag('event', event, params);
};
