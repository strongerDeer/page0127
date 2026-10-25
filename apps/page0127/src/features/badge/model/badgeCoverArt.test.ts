import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { badgeCoverArt } from './badgeCoverArt';
import { badgePresentation } from './badgePresentation';
import { computeBadges } from './badges';

const publicDir = fileURLToPath(new URL('../../../../public', import.meta.url));
const badges = computeBadges({
  books: [],
  readingGoal: null,
  firstTasteAnalysisAt: null,
});

describe('배지 표지 아트', () => {
  it('31종과 비밀 표지가 서로 다른 유효한 그림을 사용한다', () => {
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
      cells.add(`${art.src}:${art.row}:${art.column}`);
    }
    expect(cells.size).toBe(32);
  });
});
