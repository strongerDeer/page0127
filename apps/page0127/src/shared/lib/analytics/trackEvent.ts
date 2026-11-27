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
 *   랜딩    cta_click · shelf_preview_view → shelf_preview_pick → shelf_preview_save | shelf_preview_goal
 *   로그인  login_start                     ← 맛보기 저장 뒤 로그인 화면에서 떠났는지 가른다
 *   가입    sign_up                         ← 온보딩 완료(가입 버튼 클릭은 cta_click·login_start 가 센다)
 *   첫 책   first_books_save | first_books_skip ← 가입 직후 책 고르기(맛보기 없이 가입한 사람)
 *   담기    shelf_preview_claim             ← 맛보기 보관분이 서재에 들어갔다 (book_add 는 /books/add 에서만 나간다)
 *   활성화  book_add → book_complete      ← 비어 있던 구간
 *   차별화  taste_analysis_run
 *   확산    share_click
 *   새 기능  daily_sentence_* · typing_* · year_cheer_*      ← 어드민 유입분석 '이벤트 현황'(eventTimeline.ts EVENT_GROUPS)에 함께 적는다
 *   홈 책    home_page_turn · home_book_jump · home_sound_toggle
 *   케미     chemistry_run · chemistry_notify
 *   다시 오게 push_enable · push_disable · install_guide_open · install_prompt · recap_view · badge_earn
 *   소셜     follow_add · follow_remove · like_add · comment_post · league_discover · league_nudge
 *   기록     quote_save · review_save
 *   검색     book_search · reader_search
 *
 * 개인정보: 회원 id·상대 id·글 내용·검색어는 보내지 않는다. 종류·개수·참거짓만.
 *
 * 2026-11-26: 정의만 있고 아무 데서도 안 보내던 signup_start·scroll_depth 를 지웠다(어드민 표에 늘 0).
 * 스크롤은 GA '향상된 측정'(scroll, 90%)이 코드 없이 센다.
 *
 * ⚠️ 이름을 바꾸면 GA4 에 쌓인 과거 데이터와 이어지지 않는다. 새 이름은 새 이벤트다.
 */
export type AnalyticsEvent =
  | 'cta_click'
  /**
   * 오늘의 문장을 펼쳤다(SentenceBook). member: 회원인지, place: 'modal'(서재에서 연 창) | 'landing'(/sentence 랜딩, 11/24부터) | 'page'(11/24 이전 /sentence)
   */
  | 'daily_sentence_draw'
  /** 오늘의 문장 결과에서 문장을 복사했다(복사가 막힌 브라우저는 세지 않는다). member, place */
  | 'daily_sentence_copy'
  /**
   * 어린 왕자 온라인 필사 — 시작 창에서 방식을 골라 들어갔다.
   * mode: 'full'(전문 이어 쓰기) | 'chapter'(장 고르기) | 'famous'(명문장), member: 회원인지
   */
  | 'typing_start'
  /**
   * 한 쪽(명문장은 한 대목)을 끝까지 쳤다. mode, chapter(명문장은 없음), cpm, accuracy,
   * assisted: 자동 입력 흔적이 있었는지(랭킹 제외 대상), member.
   * ⚠️ 친 문장·닉네임은 보내지 않는다
   */
  | 'typing_page_complete'
  /** 한 장을 다 썼다 — 회원은 그 장의 모든 쪽이 채워진 순간, 비회원은 장의 마지막 쪽을 끝낸 순간. chapter, member */
  | 'typing_chapter_complete'
  /** 타수 랭킹에 이름을 올렸다 — 비회원 닉네임 등록 또는 회원 순위 참여 켜기. member */
  | 'typing_rank_join'
  /** 연말 응원 카드(/아이디/cheer)에서 선물 리본을 풀었다. owner: 주인인지(false 면 링크를 받은 친구) */
  | 'year_cheer_open'
  /** 친구가 받은 응원 카드에서 "나도 서재 만들기"를 눌렀다(비회원) */
  | 'year_cheer_signup_click'
  /**
   * 홈 "책 넘김"(HomeBook)에서 이번 방문 중 가장 깊은 쪽에 닿았다 — 더 깊이 갈 때만 한 번씩.
   * page: 닿은 쪽(0부터), total: 전체 넘김 수, via: 'turn'(직접 넘김) | 'jump'(목차·건너뛰기로 지나감)
   */
  | 'home_page_turn'
  /** 홈 책의 목차·건너뛰기를 눌렀다. to: 간 쪽, from: 'toc' | 'skip' | 'link' */
  | 'home_book_jump'
  /** 홈 책 넘김 소리를 켜거나 껐다. on */
  | 'home_sound_toggle'
  /** 독서 케미(궁합) 분석을 끝까지 받았다. rerun: 다시 분석인지 */
  | 'chemistry_run'
  /** 케미 결과를 상대에게 알렸다(기본은 나만 보기). 상대가 누군지는 보내지 않는다 */
  | 'chemistry_notify'
  /**
   * 알림 켜기를 눌렀다. place: 'prompt'(권유 카드) | 'settings'(설정),
   * result: 'ok'(켜짐) 또는 안 된 까닭(PushSupport — 'denied'·'not-configured' 등)
   */
  | 'push_enable'
  /** 설정에서 알림을 껐다 */
  | 'push_disable'
  /** 앱 설치 방법 창을 열었다(InstallGuideLink) */
  | 'install_guide_open'
  /** 브라우저 설치 창에 답했다(안드로이드·PC 크롬). outcome: 'accepted' | 'dismissed' */
  | 'install_prompt'
  /** 주간 회상 카드가 보였다(할 말이 있을 때만 그려진다). kind: 'this-week' | 'years-ago' | 'still-reading' */
  | 'recap_view'
  /** 새 배지를 받았다(배지마다 한 번). badge: 배지 종류 id, kind */
  | 'badge_earn'
  /** 팔로우했다. from: 'league'(리그에서 비교하려고) — 없으면 일반 팔로우 버튼 */
  | 'follow_add'
  /** 언팔로우했다 */
  | 'follow_remove'
  /** 좋아요를 눌렀다(취소는 세지 않는다) */
  | 'like_add'
  /** 댓글을 남겼다. on: 'book' | 'globalBook', reply: 답글인지. 내용은 보내지 않는다 */
  | 'comment_post'
  /** 리그에서 "다른 리더와 비교하기"를 눌러 추천 리더를 열었다 */
  | 'league_discover'
  /** 리그에서 콕 찌르기를 보냈다. context: 'ahead' | 'behind' | 'tied'(보낸 사람 기준) */
  | 'league_nudge'
  /** 기억에 남는 문장을 저장했다. edit: 고쳤는지, from: 'book'(책 상세) | 'register'(담으면서) */
  | 'quote_save'
  /** 한 줄 독후감을 새로 남기거나 바꿨다. edit, from: 'edit' | 'register' */
  | 'review_save'
  /** 도서 검색 결과가 왔다(첫 쪽만, 자동 검색이라 입력이 멈출 때마다). has_results. 검색어는 보내지 않는다 */
  | 'book_search'
  /** 리더 찾기에서 검색했다. 이름은 보내지 않는다 */
  | 'reader_search'
  /** 홈 맛보기 히어로를 봤다(마운트 한 번) — 맛보기 깔때기의 분모 */
  | 'shelf_preview_view'
  /** 홈 맛보기에서 책을 골랐다. source: 'picks' | 'search', count: 고른 뒤 권수 */
  | 'shelf_preview_pick'
  /** 맛보기 [책장 저장하기] — 로그인으로 간다. count: 고른 권수, source: shelf(책장 아래 버튼)·bar(모바일 하단 바) */
  | 'shelf_preview_save'
  /** 맛보기 0권 [목표 저장하기] — 로그인으로 간다. target: 목표 권수 */
  | 'shelf_preview_goal'
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
  /** 가입 직후 "읽은 책 고르기"에서 골라 서재로 갔다(FirstBooksPicker). count: 고른 권수 */
  | 'first_books_save'
  /** 가입 직후 "읽은 책 고르기"를 건너뛰었다 */
  | 'first_books_skip'
  /** 책을 서재에 담았다. status 로 어떤 상태로 담았는지 함께 본다 */
  | 'book_add'
  /** 완독으로 **전환**됐다. 이미 완독인 책을 다시 저장한 것은 세지 않는다 */
  | 'book_complete'
  /**
   * 바코드로 책을 찾았다(도서 추가 화면). source: 'camera' | 'photo',
   * found: 읽은 ISBN 으로 책 정보를 찾았는지
   */
  | 'book_barcode_scan'
  /**
   * 표·CSV 로 여러 권을 한 번에 담았다(/books/import). source: 'paste' | 'file',
   * rows: 읽은 줄 수, selected: 담기로 고른 수, added·skipped·failed: 서버 결과
   */
  | 'book_import'
  /** 설정에서 내 기록을 파일로 내려받았다. format: 'csv' | 'md' */
  | 'records_export'
  /** AI 취향 분석을 실행했다 */
  | 'taste_analysis_run'
  /** 공유를 눌렀다. method 로 네이티브 공유/링크 복사를 구분한다 */
  | 'share_click'
  /** 홈 화면에 설치한 앱으로 열었다(세션당 한 번). ⚠️ GoogleAnalytics 의 ga-init 이 직접 보낸다 */
  | 'app_open'
  /** 홈 화면에 설치했다(안드로이드·PC 크롬만 알려 준다). ⚠️ ga-init 이 직접 보낸다 */
  | 'app_install';

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
