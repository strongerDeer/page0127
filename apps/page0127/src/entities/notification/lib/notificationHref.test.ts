import { describe, expect, it } from 'vitest';

import { notificationHref } from './notificationHref';

describe('notificationHref', () => {
  it('콕 찌르기는 보낸 사람 서재 또는 첨부한 책으로 연결한다', () => {
    expect(
      notificationHref(
        { type: 'reading_nudge', target_id: null, target_type: null },
        'reader'
      )
    ).toBe('/reader');
    expect(
      notificationHref(
        { type: 'reading_nudge', target_id: 'book', target_type: 'book' },
        'reader'
      )
    ).toBe('/books/book');
  });
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

  it('주간 회상은 회상 카드가 있는 내 서재로 보낸다', () => {
    expect(
      notificationHref(
        { type: 'weekly_recap', target_id: null, target_type: null },
        'me'
      )
    ).toBe('/me');
  });

  it('주간 회상은 아이디를 모르면 / 로 보낸다(서재로 다시 보내진다)', () => {
    expect(
      notificationHref(
        { type: 'weekly_recap', target_id: null, target_type: null },
        null
      )
    ).toBe('/');
  });
});
