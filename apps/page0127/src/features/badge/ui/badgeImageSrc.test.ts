import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { computeBadges, SHELF_LEVELS, WIDE_VIEW_LEVELS } from '../model/badges';
import { badgeImageSrc } from './BadgeMedal';

import type { Badge } from '../model/badges';

const PUBLIC_DIR = fileURLToPath(
  new URL('../../../../public', import.meta.url)
);

const all = computeBadges({
  books: [],
  readingGoal: null,
  firstTasteAnalysisAt: null,
});

/** 받은 상태·단계별로 펼친다 — 화면이 고를 수 있는 그림 경로를 전부 */
const variants: Badge[] = all.flatMap((badge) => {
  const levels =
    badge.id === 'shelf'
      ? SHELF_LEVELS.length
      : badge.id === 'wide-view'
        ? WIDE_VIEW_LEVELS.length
        : 1;
  return [
    badge,
    ...Array.from({ length: levels }, (_, i) => ({
      ...badge,
      earned: true,
      level: badge.kind === 'growth' ? i + 1 : 0,
    })),
  ];
});

describe('badgeImageSrc', () => {
  it('고를 수 있는 그림은 모두 public 에 실제로 있다 (없으면 빈 뱃지)', () => {
    const missing = [...new Set(variants.map(badgeImageSrc))].filter(
      (src) => !existsSync(join(PUBLIC_DIR, src))
    );
    expect(missing).toEqual([]);
  });
});
