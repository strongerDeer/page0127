import { describe, expect, it } from 'vitest';

import { notificationHref } from './notificationHref';

describe('notificationHref', () => {
  it('팔로우는 보낸 사람 서재로, username 이 없으면 이동하지 않는다', () => {
    const follow = {
      type: 'follow',
      target_id: null,
      target_type: null,
    } as const;
    expect(notificationHref(follow, 'reader')).toBe('/reader');
    expect(notificationHref(follow, null)).toBeNull();
  });

  it('책 알림은 공개 상세로, 전역 책은 책 소개로 보낸다', () => {
    expect(
      notificationHref(
        { type: 'like', target_id: 'b1', target_type: 'book' },
        'reader'
      )
    ).toBe('/books/b1');
    expect(
      notificationHref(
        { type: 'comment', target_id: 'g1', target_type: 'global_book' },
        'reader'
      )
    ).toBe('/books/info/g1');
  });

  it('주간 회상은 대상이 없어도 홈으로 보낸다', () => {
    expect(
      notificationHref(
        { type: 'weekly_recap', target_id: null, target_type: null },
        null
      )
    ).toBe('/');
  });
});
