import { describe, expect, it } from 'vitest';

import { parseImportPayload } from './parseImportPayload';

const item = (patch: Record<string, unknown> = {}) => ({
  isbn: '9788936434120',
  status: 'completed',
  completed_date: '2024-03-05',
  completed_year: null,
  rating: 5,
  one_line_review: '좋았다',
  spine_ok: true,
  ...patch,
});

describe('parseImportPayload', () => {
  it('올바른 본문은 그대로 통과한다', () => {
    expect(parseImportPayload([item()], 100)).toEqual([item()]);
  });

  it('같은 ISBN 이 두 번 오면 앞의 것만 남긴다', () => {
    const result = parseImportPayload([item(), item({ rating: 1 })], 100);
    expect(result).toHaveLength(1);
    expect(result![0].rating).toBe(5);
  });

  it.each([
    ['빈 배열', []],
    ['상한 초과', [item(), item({ isbn: '9788936434137' })]],
    ['ISBN 아님', [item({ isbn: 'K123' })]],
    ['모르는 상태', [item({ status: 'dropped' })]],
    ['날짜 형식', [item({ completed_date: '2024.3.5' })]],
    ['별점 범위', [item({ rating: 10 })]],
    ['연도 범위', [item({ completed_year: 99 })]],
  ])('%s → 거절', (_, books) => {
    expect(parseImportPayload(books, 1)).toBeNull();
  });

  it('spine_ok 는 true 일 때만 true 다', () => {
    expect(
      parseImportPayload([item({ spine_ok: 'yes' })], 1)![0].spine_ok
    ).toBe(false);
  });
});
