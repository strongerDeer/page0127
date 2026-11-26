import { describe, expect, it } from 'vitest';

import { getMyLibraryLinks } from './myLibraryLinks';

describe('getMyLibraryLinks', () => {
  it('내 서재에 딸린 다섯 곳을 서재부터 차례로', () => {
    expect(getMyLibraryLinks('hj').map((l) => [l.label, l.href])).toEqual([
      ['내 서재', '/hj'],
      ['문장 서랍', '/hj/quotes'],
      ['주간 회상', '/books/recap'],
      ['배지 책장', '/hj/badges'],
      ['AI 취향 분석', '/dashboard/taste-analysis'],
    ]);
  });

  it('아이디를 모르면 아이디가 들어가는 주소는 뺀다', () => {
    expect(getMyLibraryLinks(null).map((l) => l.href)).toEqual([
      '/books/recap',
      '/dashboard/taste-analysis',
    ]);
  });
});
