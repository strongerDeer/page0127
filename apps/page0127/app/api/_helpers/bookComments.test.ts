import { describe, expect, it } from 'vitest';

import { buildCommentTree } from './bookComments';

const profiles = [
  { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
  { id: 'u2', nickname: null, username: 'jieun', photo_url: 'p.png' },
];

const row = (over: Partial<Parameters<typeof buildCommentTree>[0][number]>) => ({
  id: 'c1',
  user_id: 'u1',
  parent_comment_id: null,
  content: '내용',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  ...over,
});

describe('buildCommentTree', () => {
  it('부모 댓글 아래에 대댓글을 중첩한다', () => {
    const result = buildCommentTree(
      [
        row({ id: 'c1' }),
        row({ id: 'c2', parent_comment_id: 'c1', content: '답글' }),
      ],
      profiles
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].replies.map((r) => r.id)).toEqual(['c2']);
  });

  it('닉네임이 없으면 username으로 대체한다', () => {
    const result = buildCommentTree([row({ id: 'c1', user_id: 'u2' })], profiles);

    expect(result[0].user).toEqual({
      id: 'u2',
      nickname: 'jieun',
      photoUrl: 'p.png',
    });
  });

  it('탈퇴한 사용자(user_id=null)는 user를 null로 둔다', () => {
    const result = buildCommentTree([row({ id: 'c1', user_id: null })], profiles);

    expect(result[0].userId).toBeNull();
    expect(result[0].user).toBeNull();
  });

  it('부모가 목록에 없는 대댓글은 버리지 않고 루트로 올린다', () => {
    const result = buildCommentTree(
      [row({ id: 'c2', parent_comment_id: 'missing' })],
      profiles
    );

    expect(result.map((c) => c.id)).toEqual(['c2']);
  });

  it('created_at 오름차순으로 정렬한다', () => {
    const result = buildCommentTree(
      [
        row({ id: 'late', created_at: '2026-07-05T00:00:00Z' }),
        row({ id: 'early', created_at: '2026-07-01T00:00:00Z' }),
      ],
      profiles
    );

    expect(result.map((c) => c.id)).toEqual(['early', 'late']);
  });
});
