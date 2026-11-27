import { describe, expect, it } from 'vitest';

import {
  addOptimisticComment,
  countComments,
  isPendingComment,
  replaceComment,
} from './optimisticCache';

import type { Comment } from '@/entities/comment';

const c = (id: string, parentCommentId: string | null = null): Comment => ({
  id,
  userId: 'u1',
  parentCommentId,
  content: id,
  createdAt: '2026-11-27T00:00:00Z',
  updatedAt: '2026-11-27T00:00:00Z',
  user: null,
  replies: [],
});

describe('addOptimisticComment', () => {
  it('루트 댓글은 맨 뒤에 붙는다(시간순 목록)', () => {
    const result = addOptimisticComment([c('a'), c('b')], c('temp-1'));
    expect(result.map((x) => x.id)).toEqual(['a', 'b', 'temp-1']);
  });

  it('답글은 부모의 replies 맨 뒤에 붙고 원본은 그대로다', () => {
    const before = [{ ...c('a'), replies: [c('r1', 'a')] }, c('b')];
    const result = addOptimisticComment(before, c('temp-1', 'a'));
    expect(result[0].replies?.map((x) => x.id)).toEqual(['r1', 'temp-1']);
    expect(before[0].replies).toHaveLength(1);
  });
});

describe('replaceComment', () => {
  it('루트 임시 댓글을 진짜로 바꾼다', () => {
    const result = replaceComment([c('a'), c('temp-1')], 'temp-1', c('real'));
    expect(result.map((x) => x.id)).toEqual(['a', 'real']);
  });

  it('답글 자리의 임시 댓글도 바꾼다', () => {
    const before = [{ ...c('a'), replies: [c('temp-1', 'a')] }];
    const result = replaceComment(before, 'temp-1', c('real', 'a'));
    expect(result[0].replies?.map((x) => x.id)).toEqual(['real']);
  });
});

describe('countComments / isPendingComment', () => {
  it('대댓글까지 센다', () => {
    expect(countComments([{ ...c('a'), replies: [c('r', 'a')] }, c('b')])).toBe(3);
  });

  it('temp- 로 시작하면 저장 전 댓글이다', () => {
    expect(isPendingComment(c('temp-9'))).toBe(true);
    expect(isPendingComment(c('abc'))).toBe(false);
  });
});
