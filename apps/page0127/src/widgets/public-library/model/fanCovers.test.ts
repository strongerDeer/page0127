import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { pickFanCovers } from './fanCovers';

const done = (title: string, completed_date: string, extra = {}) =>
  createTestBook({
    title,
    status: 'completed',
    completed_date,
    cover_image: `https://x.test/${title}.jpg`,
    ...extra,
  });

describe('pickFanCovers', () => {
  it('최근 완독 순으로 3권', () => {
    const picked = pickFanCovers([
      done('A', '2026-01-01'),
      done('B', '2026-03-01'),
      done('C', '2026-02-01'),
      done('D', '2026-04-01'),
    ]);
    expect(picked.map((b) => b.title)).toEqual(['D', 'B', 'C']);
  });

  it('재독한 책은 한 장만 — 같은 표지가 두 장 서면 부채꼴이 어색하다', () => {
    const picked = pickFanCovers([
      done('재독', '2026-05-01', { isbn: '9791111111111', read_count: 2 }),
      done('재독', '2026-04-15', { isbn: '9791111111111', read_count: 1 }),
      done('B', '2026-04-01'),
      done('C', '2026-03-01'),
    ]);
    expect(picked.map((b) => b.title)).toEqual(['재독', 'B', 'C']);
  });

  it('저장된 표지(cover_image)가 없으면 뺀다 — provider_item_id 만으로는 표지가 안 그려진다', () => {
    const picked = pickFanCovers([
      done('표지 없음', '2026-05-01', {
        cover_image: null,
        provider_item_id: '123',
      }),
      done('B', '2026-04-01'),
    ]);
    expect(picked.map((b) => b.title)).toEqual(['B']);
  });

  it('완독이 아니거나 완독일이 없으면 뺀다', () => {
    const picked = pickFanCovers([
      done('읽는 중', '2026-05-01', { status: 'reading' }),
      done('날짜 없음', '2026-05-01', { completed_date: null }),
      done('B', '2026-04-01'),
    ]);
    expect(picked.map((b) => b.title)).toEqual(['B']);
  });
});
