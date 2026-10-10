import { describe, expect, it } from 'vitest';

import { toPicksCacheKey } from './picksCacheKey';

describe('toPicksCacheKey', () => {
  it('목록이 바뀌면 키도 바뀐다 — 배포 즉시 새 목록을 받는다', () => {
    expect(toPicksCacheKey(['a', 'b'])).not.toEqual(
      toPicksCacheKey(['a', 'c'])
    );
  });

  it('순서만 바뀌어도 키가 바뀐다 — 묶음 순서가 곧 화면 순서다', () => {
    expect(toPicksCacheKey(['a', 'b'])).not.toEqual(
      toPicksCacheKey(['b', 'a'])
    );
  });

  it('같은 목록이면 같은 키 — 배포마다 캐시를 버리지 않는다', () => {
    expect(toPicksCacheKey(['a', 'b'])).toEqual(toPicksCacheKey(['a', 'b']));
  });
});
