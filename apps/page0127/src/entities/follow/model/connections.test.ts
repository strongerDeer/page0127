import { describe, expect, it } from 'vitest';

import { toConnectionIds } from './connections';

describe('toConnectionIds', () => {
  it('나 + 내가 팔로우하는 사람 + 나를 팔로우하는 사람을 모은다', () => {
    const ids = toConnectionIds(
      [
        { follower_id: 'me', following_id: 'a' },
        { follower_id: 'b', following_id: 'me' },
        // 맞팔은 두 행이지만 한 번만
        { follower_id: 'a', following_id: 'me' },
      ],
      'me'
    );
    expect([...ids].sort()).toEqual(['a', 'b', 'me']);
  });

  it('팔로우 관계가 없으면 나만 남는다', () => {
    expect([...toConnectionIds([], 'me')]).toEqual(['me']);
  });
});
