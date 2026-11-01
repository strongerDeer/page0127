import { describe, expect, it } from 'vitest';

import { pickFollowCounts, toFollowCountMap } from './followCounts';

describe('toFollowCountMap', () => {
  it('뷰 행을 user_id 별 숫자로 바꾼다 (bigint 문자열도 숫자로)', () => {
    const map = toFollowCountMap([
      { user_id: 'a', followers_count: 3, following_count: '5' },
    ]);
    expect(pickFollowCounts(map, 'a')).toEqual({
      followers_count: 3,
      following_count: 5,
    });
  });

  it('뷰에 없는 사용자·조회 실패는 0으로 둔다', () => {
    expect(pickFollowCounts(toFollowCountMap(null), 'x')).toEqual({
      followers_count: 0,
      following_count: 0,
    });
  });
});
