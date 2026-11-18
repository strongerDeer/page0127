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
  /** default=기본 띠지 문구, custom=이 슬라이드의 문구·색 */
  beltStyle: BeltStyle;
  /** 홈 앞표지 — 기본 파란 표지이거나 기념일용으로 갈아입힌 표지 */
  cover: HeroCover;
};

export type BeltStyle = 'default' | 'custom';
export type CoverStyle = 'default' | 'custom';

/** 표지 위 그림. 위치는 표지 기준 %(그림 가운데), 크기는 표지 너비 대비 % */
export type HeroCoverArt = {
  url: string;
  x: number;
  y: number;
  w: number;
};

/**
 * 판별 유니온 — style 이 'custom' 일 때만 색·제목·그림이 있다.
 * DB 의 cover_style 칸과 1:1 이라 "값을 비운 것"과 "기본을 고른 것"이 섞이지 않는다.
 */
export type HeroCover =
  | { style: 'default' }
  | {
      style: 'custom';
      bg: string;
      fg: string;
      /** 비우면 기본 제목(굴러가는 단어)을 그대로 쓴다 */
      title: string | null;
      /** 큰 숫자 "0127." 을 보일지 */
      showNumber: boolean;
      art: HeroCoverArt | null;
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
  'id, eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order, is_active, audience, starts_at, ends_at, click_count, belt_style, cover_style, cover_bg, cover_fg, cover_title, show_number, art_url, art_x, art_y, art_w';

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
  belt_style: BeltStyle;
  cover_style: CoverStyle;
  cover_bg: string | null;
  cover_fg: string | null;
  cover_title: string | null;
  show_number: boolean;
  art_url: string | null;
  art_x: number;
  art_y: number;
  art_w: number;
};
