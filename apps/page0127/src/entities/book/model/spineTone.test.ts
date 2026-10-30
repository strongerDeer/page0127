import { describe, expect, it } from 'vitest';

import { SPINE_TONE_COUNT, spineTone } from './spineTone';

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
});
