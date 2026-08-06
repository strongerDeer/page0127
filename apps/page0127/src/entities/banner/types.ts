/**
 * 히어로 배너 슬라이드 타입 (FSD entity)
 *
 * HeroSlide는 화면 표시용, HeroSlideRow는 DB 행.
 * widget(landing)·feature(admin-banners) 양쪽이 이 entity에서 import한다.
 */
export type HeroSlide = {
  id: string;
  eyebrow: string;
  /** 2줄 메인 카피 */
  lines: [string, string];
  sub: string;
  href: string;
  cta: string;
  /** 배경색 hex (단색) */
  bg: string;
  /** 글자색 hex */
  fg: string;
};

/**
 * 슬라이드 행이 가진 모든 컬럼.
 *
 * 랜딩 조회와 어드민 조회가 각각 select 문자열을 들고 있었다. 그래서 컬럼을 넷
 * 늘렸을 때 한쪽만 고치고 다른 쪽은 그대로였고, 어드민이 click_count 를
 * undefined 로 읽어 500 이 났다(실제로 발생). 목록을 한 곳에 두어 그 어긋남이
 * 생길 자리를 없앤다.
 */
export const HERO_SLIDE_COLUMNS =
  'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active, audience, starts_at, ends_at, click_count';

export type HeroSlideRow = {
  id: string;
  eyebrow: string;
  line1: string;
  line2: string;
  sub: string;
  href: string;
  cta: string;
  bg: string;
  fg: string;
  sort_order: number;
  is_active: boolean;
  /** 노출 대상 — all/guest/member. DB CHECK 과 같은 값이다 */
  audience: 'all' | 'guest' | 'member';
  /** 예약 게시 구간. null 이면 제한 없음 */
  starts_at: string | null;
  ends_at: string | null;
  /** 누적 클릭 수 — 어드민 목록에서 눈으로 비교하는 값 */
  click_count: number;
};
