import { describe, expect, it } from 'vitest';

import { buildPushPayload } from './pushPayload';

const base = {
  user_id: 'owner',
  actor_id: 'actor',
  target_id: null,
  target_type: null,
} as const;

describe('buildPushPayload', () => {
  it('다른 사람이 보낸 알림은 "이름 + 문장"으로 만든다', () => {
    expect(
      buildPushPayload(
        { ...base, type: 'like', target_id: 'b1', target_type: 'book' },
        { nickname: '책벌레', username: 'reader' }
      )
    ).toEqual({
      title: 'page0127.',
      body: '책벌레님이 좋아요를 눌렀습니다',
      url: '/books/b1',
    });
  });

  it('책 제목을 알면 넣고, 답글은 답글이라고 말한다', () => {
    expect(
      buildPushPayload(
        { ...base, type: 'comment', target_id: 'b1', target_type: 'book' },
        { nickname: '책벌레', username: 'reader' },
        { title: '데미안', isReply: true }
      )?.body
    ).toBe('책벌레님이 『데미안』에서 내 댓글에 답글을 남겼습니다');
  });

  it('보낸 사람 프로필을 못 읽었으면 이름을 비우지 않고 "누군가"로 쓴다', () => {
    expect(buildPushPayload({ ...base, type: 'follow' }, null)).toEqual({
      title: 'page0127.',
      body: '누군가님이 팔로우했습니다',
      url: '/notifications',
    });
  });

  it('나에게 오는 알림은 크론이 적은 문장을 그대로 쓴다', () => {
    expect(
      buildPushPayload(
        {
          ...base,
          type: 'weekly_recap',
          message: '이번 주에 2권을 다 읽었어요.',
        },
        null
      )
    ).toEqual({
      title: 'page0127.',
      body: '이번 주에 2권을 다 읽었어요.',
      url: '/',
    });
  });

  it('나에게 오는 알림에 문장이 없으면 보내지 않는다', () => {
    expect(
      buildPushPayload({ ...base, type: 'reading_reminder' }, null)
    ).toBeNull();
  });
});
