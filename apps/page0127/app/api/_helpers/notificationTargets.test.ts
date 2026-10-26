import { describe, expect, it } from 'vitest';

import { toNotificationTarget } from './notificationTargets';

const books = new Map([
  ['book-1', { id: 'book-1', title: '데미안', user_id: 'owner' }],
]);
const globalBooks = new Map([
  ['global-1', { id: 'global-1', title: '대온실 수리 보고서' }],
]);

const noti = (
  overrides: Partial<Parameters<typeof toNotificationTarget>[0]>
): Parameters<typeof toNotificationTarget>[0] => ({
  user_id: 'owner',
  type: 'comment',
  target_id: 'book-1',
  target_type: 'book',
  ...overrides,
});

describe('toNotificationTarget', () => {
  it('책 봉투에는 읽을 수 있는 책의 표지와 저자를 함께 담는다', () => {
    const visibleBooks = new Map([
      [
        'book-1',
        {
          id: 'book-1',
          title: '데미안',
          user_id: 'sender',
          cover_image: 'https://example.com/cover.jpg',
          author: '헤르만 헤세',
        },
      ],
    ]);
    expect(
      toNotificationTarget(
        noti({ type: 'reading_nudge' }),
        visibleBooks,
        globalBooks
      )
    ).toEqual({
      title: '데미안',
      isReply: false,
      cover_image: 'https://example.com/cover.jpg',
      author: '헤르만 헤세',
    });
  });

  it('삭제·비공개 책의 표지와 저자는 봉투에도 노출하지 않는다', () => {
    expect(
      toNotificationTarget(
        noti({ type: 'reading_nudge', target_id: 'hidden' }),
        books,
        globalBooks
      )
    ).toBeNull();
  });

  it('책 주인이 받은 댓글 알림은 댓글이다', () => {
    expect(toNotificationTarget(noti({}), books, globalBooks)).toEqual({
      title: '데미안',
      isReply: false,
    });
  });

  it('책 주인이 아닌 사람이 받은 댓글 알림은 답글이다', () => {
    expect(
      toNotificationTarget(
        noti({ user_id: 'parent-author' }),
        books,
        globalBooks
      )
    ).toEqual({ title: '데미안', isReply: true });
  });

  it('좋아요는 답글이 아니다', () => {
    expect(
      toNotificationTarget(noti({ type: 'like' }), books, globalBooks)
    ).toEqual({ title: '데미안', isReply: false });
  });

  it('전역 책 댓글 알림은 늘 답글이다', () => {
    expect(
      toNotificationTarget(
        noti({ target_id: 'global-1', target_type: 'global_book' }),
        books,
        globalBooks
      )
    ).toEqual({ title: '대온실 수리 보고서', isReply: true });
  });

  it('못 읽는 책이면 아무것도 모른다', () => {
    expect(
      toNotificationTarget(noti({ target_id: 'gone' }), books, globalBooks)
    ).toBeNull();
  });

  it('팔로우·나에게 오는 알림은 대상이 없다', () => {
    expect(
      toNotificationTarget(
        noti({ type: 'follow', target_id: null, target_type: null }),
        books,
        globalBooks
      )
    ).toBeNull();
    expect(
      toNotificationTarget(noti({ type: 'weekly_recap' }), books, globalBooks)
    ).toBeNull();
  });
});
