import { describe, expect, it } from 'vitest';

import { mergeStreamItems } from './bookStream';

import type { CommentNode } from './bookComments';
import type { StreamActivity } from './bookStream';

const activity = (id: string, createdAt: string): StreamActivity => ({
  kind: 'activity',
  id,
  activityType: 'book_added',
  content: null,
  createdAt,
});

const comment = (id: string, createdAt: string): CommentNode => ({
  id,
  userId: 'u1',
  parentCommentId: null,
  content: '댓글',
  createdAt,
  updatedAt: createdAt,
  user: { id: 'u1', nickname: '경민', photoUrl: null },
  replies: [],
});

describe('mergeStreamItems', () => {
  it('활동과 댓글을 created_at 오름차순으로 섞는다', () => {
    const result = mergeStreamItems(
      [
        activity('a1', '2026-07-01T00:00:00Z'),
        activity('a2', '2026-07-20T00:00:00Z'),
      ],
      [
        comment('c1', '2026-07-10T00:00:00Z'),
        comment('c2', '2026-07-25T00:00:00Z'),
      ]
    );

    expect(result.map((i) => i.id)).toEqual(['a1', 'c1', 'a2', 'c2']);
  });

  it('시각이 같으면 활동을 먼저 놓는다', () => {
    const same = '2026-07-01T00:00:00Z';
    const result = mergeStreamItems(
      [activity('a1', same)],
      [comment('c1', same)]
    );

    expect(result.map((i) => i.id)).toEqual(['a1', 'c1']);
  });

  it('댓글에 kind를 붙이고 대댓글은 중첩된 채로 둔다', () => {
    const parent = comment('c1', '2026-07-01T00:00:00Z');
    parent.replies = [comment('c2', '2026-07-02T00:00:00Z')];

    const result = mergeStreamItems([], [parent]);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('comment');
    expect(result[0].kind === 'comment' && result[0].replies).toHaveLength(1);
  });

  it('양쪽이 비면 빈 배열', () => {
    expect(mergeStreamItems([], [])).toEqual([]);
  });
});
