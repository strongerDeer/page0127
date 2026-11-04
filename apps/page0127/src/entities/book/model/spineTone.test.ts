import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SPINE_TONE_COLORS, SPINE_TONE_COUNT, spineTone } from './spineTone';

describe('spineTone', () => {
  it('같은 책은 언제나 같은 색이다', () => {
    expect(spineTone('book-a')).toBe(spineTone('book-a'));
  });

  it('색 번호는 0 ~ 7 사이다', () => {
    for (let i = 0; i < 200; i += 1) {
      const tone = spineTone(`book-${i}`);
      expect(tone).toBeGreaterThanOrEqual(0);
      expect(tone).toBeLessThan(SPINE_TONE_COUNT);
    }
  });

  it('여러 권이면 색이 고르게 흩어진다', () => {
    const tones = new Set(
      Array.from({ length: 40 }, (_, i) => spineTone(`book-${i}`))
    );
    expect(tones.size).toBeGreaterThanOrEqual(6);
  });

  it('서재 책장 CSS 의 data-tone 색과 전체 도서 책등 색이 같다', () => {
    const css = readFileSync(
      resolve(__dirname, '../../../widgets/book/ui/PublicBookShelf.module.css'),
      'utf8'
    );
    const shelfColors = Array.from({ length: SPINE_TONE_COUNT }, (_, tone) => {
      const match = css.match(
        new RegExp(
          `\\[data-tone="${tone}"\\]\\s*\\{\\s*--spine-bg:\\s*(#[0-9a-f]{6})`,
          'i'
        )
      );
      return match?.[1]?.toLowerCase();
    });
    expect(shelfColors).toEqual([...SPINE_TONE_COLORS]);
  });
});
