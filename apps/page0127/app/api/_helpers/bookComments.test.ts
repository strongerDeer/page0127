import { describe, expect, it } from 'vitest';

import { buildCommentTree, classifyBookCommentError } from './bookComments';

const profiles = [
  { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
  { id: 'u2', nickname: null, username: 'jieun', photo_url: 'p.png' },
];

const row = (
  over: Partial<Parameters<typeof buildCommentTree>[0][number]>
) => ({
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
    const result = buildCommentTree(
      [row({ id: 'c1', user_id: 'u2' })],
      profiles
    );

    expect(result[0].user).toEqual({
      id: 'u2',
      nickname: 'jieun',
      photoUrl: 'p.png',
    });
  });

  it('탈퇴한 사용자(user_id=null)는 user를 null로 둔다', () => {
    const result = buildCommentTree(
      [row({ id: 'c1', user_id: null })],
      profiles
    );

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

  // Postgres 는 마이크로초가 0이면 소수부를 생략한다. localeCompare 로 비교하면
  // '.' 이 무시돼 순서가 뒤집히므로, 소수부 유무가 갈리는 조합을 고정해 둔다.
  it('소수부가 있는 시각과 없는 시각을 뒤집지 않는다', () => {
    const result = buildCommentTree(
      [
        row({ id: '나중', created_at: '2026-07-01T00:00:05.123456+00:00' }),
        row({ id: '먼저', created_at: '2026-07-01T00:00:05+00:00' }),
      ],
      profiles
    );

    expect(result.map((c) => c.id)).toEqual(['먼저', '나중']);
  });
});

describe('classifyBookCommentError', () => {
  it('메시지에 1depth가 포함되면 400과 안내 문구를 준다', () => {
    expect(
      classifyBookCommentError({
        message: '대댓글의 대댓글은 작성할 수 없습니다. (1depth만 허용)',
      })
    ).toEqual({
      message: '대댓글의 대댓글은 작성할 수 없습니다.',
      status: 400,
    });
  });

  it('메시지에 다른 대상이 포함되면 400과 안내 문구를 준다', () => {
    expect(
      classifyBookCommentError({
        message: '부모 댓글과 다른 대상에는 답글을 달 수 없습니다.',
      })
    ).toEqual({ message: '잘못된 답글 대상입니다.', status: 400 });
  });

  it('code가 42501이면 403 권한 없음으로 분류한다', () => {
    expect(
      classifyBookCommentError({ code: '42501', message: '아무 메시지' })
    ).toEqual({ message: '권한이 없습니다.', status: 403 });
  });

  it('메시지에 row-level security가 포함되면 403 권한 없음으로 분류한다', () => {
    expect(
      classifyBookCommentError({
        message:
          'new row violates row-level security policy for table "book_comments"',
      })
    ).toEqual({ message: '권한이 없습니다.', status: 403 });
  });

  it('그 외 에러는 500과 원본 메시지를 그대로 유지한다', () => {
    expect(classifyBookCommentError({ message: '알 수 없는 DB 에러' })).toEqual(
      { message: '알 수 없는 DB 에러', status: 500 }
    );
  });
});
