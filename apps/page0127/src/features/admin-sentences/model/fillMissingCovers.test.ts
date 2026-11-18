import { describe, expect, it, vi } from 'vitest';

import { fillMissingCovers } from './fillMissingCovers';

import type { SentenceValues } from './sentenceForm';

const row = (overrides: Partial<SentenceValues>): SentenceValues => ({
  text: '문장',
  book_title: '책',
  author: null,
  translator: null,
  page: null,
  isbn: null,
  cover_image: null,
  rights_note: null,
  ...overrides,
});

describe('fillMissingCovers', () => {
  it('표지가 빈 줄만 ISBN 으로 채우고, 같은 ISBN 은 한 번만 찾는다', async () => {
    const lookup = vi.fn(async (isbn: string) =>
      isbn === '111' ? 'https://image.yes24.com/goods/1/XL' : null
    );
    const result = await fillMissingCovers(
      [
        row({ text: 'a', isbn: '111' }),
        row({ text: 'b', isbn: '111' }),
        row({ text: 'c', isbn: '222' }),
        row({ text: 'd' }),
        row({
          text: 'e',
          isbn: '111',
          cover_image: 'https://image.yes24.com/goods/9/XL',
        }),
      ],
      lookup
    );

    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.filled).toBe(2);
    expect(result.rows.map((r) => r.cover_image)).toEqual([
      'https://image.yes24.com/goods/1/XL',
      'https://image.yes24.com/goods/1/XL',
      null,
      null,
      'https://image.yes24.com/goods/9/XL',
    ]);
  });

  it('조회가 실패하거나 허용하지 않은 주소면 표지 없이 둔다', async () => {
    const result = await fillMissingCovers(
      [row({ isbn: '1' }), row({ text: 'x', isbn: '2' })],
      async (isbn) => {
        if (isbn === '1') throw new Error('timeout');
        return 'https://evil.example.com/a.jpg';
      }
    );
    expect(result.filled).toBe(0);
    expect(result.rows.every((r) => r.cover_image === null)).toBe(true);
  });
});
