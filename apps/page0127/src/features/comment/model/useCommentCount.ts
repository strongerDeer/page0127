'use client';

import { useQuery } from '@tanstack/react-query';

import { commentApi, commentKeys } from '@/entities/comment';

import { countComments } from './optimisticCache';

import type { CommentTarget } from '@/entities/comment';

/**
 * 댓글 수 — 캐시를 구독만 한다(직접 조회하지 않음)
 *
 * 학습 포인트:
 * - enabled:false 인 useQuery 는 요청을 보내지 않지만, 같은 키의 캐시가 바뀌면
 *   다시 그린다. 그래서 스레드가 댓글을 쓰거나 지우면 액션 바 숫자도 같이 바뀐다.
 * - 캐시가 아직 없으면 목록 API 가 세어 준 값(fallback)을 쓴다.
 */
export const useCommentCount = (target: CommentTarget, fallback: number) => {
  const { data } = useQuery({
    queryKey: commentKeys.byTarget(target),
    queryFn: () => commentApi.getComments(target),
    enabled: false,
  });
  return data ? countComments(data) : fallback;
};
