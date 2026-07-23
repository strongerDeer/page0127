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
};
