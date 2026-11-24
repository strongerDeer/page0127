import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { badgeAtlasStyle, badgeCoverArt } from './badgeCoverArt';
import { badgePresentation } from './badgePresentation';
import { computeBadges } from './badges';

const publicDir = fileURLToPath(new URL('../../../../public', import.meta.url));
const badges = computeBadges({
  books: [],
  readingGoal: null,
  firstTasteAnalysisAt: null,
});

describe('배지 표지 아트', () => {
  it('30종과 비밀 표지가 서로 다른 유효한 그림을 사용한다', () => {
    const cells = new Set<string>();
    for (const badge of [
      ...badges.map((b) => ({ ...b, earned: true })),
      badges.find((b) => b.kind === 'hidden')!,
    ]) {
      const art = badgeCoverArt(badgePresentation(badge).cover);
      expect(art.column).toBeGreaterThanOrEqual(0);
      expect(art.column).toBeLessThan(art.columns);
      expect(art.row).toBeGreaterThanOrEqual(0);
      expect(art.row).toBeLessThan(art.rows);
      expect(existsSync(publicDir + art.src)).toBe(true);
      const bytes = readFileSync(publicDir + art.src);
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(art.width);
      expect(bytes.readUInt32BE(20)).toBe(art.height);
      if (art.crop) {
        expect(art.crop.x).toBeGreaterThanOrEqual(0);
        expect(art.crop.y).toBeGreaterThanOrEqual(0);
        expect(art.crop.width).toBeGreaterThan(0);
        expect(art.crop.height).toBeGreaterThan(0);
        expect(art.crop.x + art.crop.width).toBeLessThanOrEqual(art.width);
        expect(art.crop.y + art.crop.height).toBeLessThanOrEqual(art.height);
      }
      cells.add(`${art.src}:${art.row}:${art.column}`);
    }
    expect(cells.size).toBe(31);
  });
});

describe('badgeAtlasStyle', () => {
  // 이 assertion 이 잠그는 것: 시트를 가로·세로 같은 배율로 키운다 — height 는 늘 auto
  // (따로 늘리면 Lighthouse "이미지 가로세로 비율" 감점, 2026-11-24)
  it('높이는 원본 비율을 따르고(auto), 칸이 표지 폭 이상을 덮는다', () => {
    const art = badgeCoverArt('unwritten');
    const style = badgeAtlasStyle(art);
    expect(style.height).toBe('auto');
    const widthCqw = parseFloat(style.width);
    expect(widthCqw / art.columns).toBeGreaterThanOrEqual(100);
  });

  it('crop 칸 하나가 표지를 빈틈없이 덮는다(폭·높이 모두)', () => {
    const art = badgeCoverArt('worn-out');
    const crop = art.crop!;
    const perCqw = parseFloat(badgeAtlasStyle(art).width) / art.width;
    expect(crop.width * perCqw).toBeGreaterThanOrEqual(99.99);
    expect(crop.height * perCqw).toBeGreaterThanOrEqual((4 / 3) * 98 - 0.01);
  });
});
