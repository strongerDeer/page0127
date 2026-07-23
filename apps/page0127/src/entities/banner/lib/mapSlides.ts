import type { HeroSlide, HeroSlideRow } from '../types';

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
