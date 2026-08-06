import { describe, expect, it } from 'vitest';

import { filterForViewer, isForViewer } from './audience';

describe('isForViewer', () => {
  it("'all' 은 누구에게나 보인다", () => {
    expect(isForViewer('all', true)).toBe(true);
    expect(isForViewer('all', false)).toBe(true);
  });

  it("'guest' 는 비로그인에게만 보인다", () => {
    // "지금 가입하세요" 를 이미 가입한 사람에게 보여주면 틀린 말이 된다
    expect(isForViewer('guest', false)).toBe(true);
    expect(isForViewer('guest', true)).toBe(false);
  });

  it("'member' 는 로그인에게만 보인다", () => {
    expect(isForViewer('member', true)).toBe(true);
    expect(isForViewer('member', false)).toBe(false);
  });
});

describe('filterForViewer', () => {
  const slides = [
    { id: 'a', audience: 'all' as const },
    { id: 'b', audience: 'guest' as const },
    { id: 'c', audience: 'member' as const },
    { id: 'd', audience: 'all' as const },
  ];

  it('비로그인은 all + guest 를 본다', () => {
    expect(filterForViewer(slides, false).map((s) => s.id)).toEqual([
      'a',
      'b',
      'd',
    ]);
  });

  it('로그인은 all + member 를 본다', () => {
    expect(filterForViewer(slides, true).map((s) => s.id)).toEqual([
      'a',
      'c',
      'd',
    ]);
  });

  it('순서를 바꾸지 않는다 — sort_order 로 정렬된 결과를 그대로 유지해야 한다', () => {
    const result = filterForViewer(slides, false);
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'd']);
  });

  it('맞는 슬라이드가 하나도 없으면 빈 배열이다 (호출부가 폴백을 결정한다)', () => {
    expect(filterForViewer([{ id: 'x', audience: 'member' as const }], false)).toEqual(
      []
    );
  });
});
