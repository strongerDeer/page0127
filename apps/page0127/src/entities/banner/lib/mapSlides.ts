import type { HeroCover, HeroSlide, HeroSlideRow } from '../types';

/** 기본 표지 색 — AboutHero.module.css 의 --cover/--cover-ink 와 같은 값 */
export const DEFAULT_COVER_BG = '#0969e0';
export const DEFAULT_COVER_FG = '#fbf1e6';

export function rowToCover(row: HeroSlideRow): HeroCover {
  if (row.cover_style !== 'custom') return { style: 'default' };
  return {
    style: 'custom',
    bg: row.cover_bg || DEFAULT_COVER_BG,
    fg: row.cover_fg || DEFAULT_COVER_FG,
    title: row.cover_title?.trim() || null,
    showNumber: row.show_number,
    art: row.art_url
      ? { url: row.art_url, x: row.art_x, y: row.art_y, w: row.art_w }
      : null,
  };
}

export function rowToHeroSlide(row: HeroSlideRow): HeroSlide {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    lines: [row.line1, row.line2],
    sub: row.sub,
    href: row.href,
    cta: row.cta,
    bg: row.bg,
    fg: row.fg,
    beltStyle: row.belt_style === 'default' ? 'default' : 'custom',
    cover: rowToCover(row),
  };
}

/** DB 행이 있으면 매핑, 없으면 폴백 상수를 그대로 반환 */
export function slidesOrFallback(
  rows: HeroSlideRow[],
  fallback: HeroSlide[]
): HeroSlide[] {
  if (rows.length === 0) return fallback;
  return rows.map(rowToHeroSlide);
}
