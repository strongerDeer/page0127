'use client';

import { useEffect, useRef, useState } from 'react';

import { Spinner } from '@repo/ui';
import { useQuery } from '@tanstack/react-query';

import { commentApi, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { countComments } from '../model/optimisticCache';
import { CommentComposer } from './CommentComposer';
import { commentAuthorName, CommentItem } from './CommentItem';

import type { ReplyTarget } from './CommentComposer';
import type { Comment, CommentTarget } from '@/entities/comment';

type CommentThreadProps = {
  target: CommentTarget;
  /**
   * 목록 API 가 이미 내려 준 댓글(피드). 주면 처음에 조회하지 않는다 —
   * 카드 20장이 각자 /comments 를 부르는 N+1 을 막는다.
   */
  initialComments?: Comment[];
  /**
   * 루트 댓글이 이보다 많으면 오래된 쪽을 접고 최근 N개만 보여 준다.
   * 피드는 2, 책 정보·책 이야기는 20. 접힌 건 맨 위 "이전 댓글 N개 보기"로 편다.
   */
  visibleCount?: number;
  placeholder?: string;
  /** 댓글이 없고 로그인도 안 했을 때 한 줄 안내 */
  emptyText?: string;
  /** 처음 그릴 때 입력칸에 포커스(피드에서 "댓글"을 눌러 연 경우) */
  autoFocus?: boolean;
};

/**
 * 댓글 스레드 — 목록(시간순) + 맨 아래 입력칸 하나
 *
 * 학습 포인트:
 * - 피드·책 정보·책 이야기가 이 부품 하나를 같이 쓴다. 화면마다 순서·정렬이 달랐던 것
 *   (입력이 위/아래, 최신/오래된 순)을 한 곳에서 맞춘다.
 * - "접기"는 개수가 많을 때만. 처음부터 펼쳐 둬야 대화가 보인다(HJ, 2026-11-27).
 * - initialData 로 피드가 준 댓글을 캐시에 심는다. 쓰기·삭제 뒤 무효화되면 그때부터는
 *   이 대상의 /comments 를 직접 받는다.
 */
export const CommentThread = ({
  target,
  initialComments,
  visibleCount = 20,
  placeholder,
  emptyText = '아직 남긴 말이 없어요.',
  autoFocus = false,
}: CommentThreadProps) => {
  const { currentUser, isLoading: isUserLoading } = useCurrentUserContext();
  const [showAll, setShowAll] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 처음 그린 시각 — 피드가 준 댓글을 "방금 받은 것"으로 표시하는 데 쓴다(렌더 중 Date.now 금지)
  const [mountedAt] = useState(() => Date.now());

  const { data: comments, isLoading } = useQuery({
    queryKey: commentKeys.byTarget(target),
    queryFn: () => commentApi.getComments(target),
    initialData: initialComments,
    // 피드가 방금 준 데이터라 바로 다시 받지 않는다(기본 staleTime 과 같은 1분)
    initialDataUpdatedAt: initialComments ? mountedAt : undefined,
  });

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const list = comments ?? [];
  const hiddenRoots = showAll ? 0 : Math.max(0, list.length - visibleCount);
  const visible = hiddenRoots > 0 ? list.slice(hiddenRoots) : list;
  // 접힌 개수는 답글까지 센다 — 숫자가 액션 바의 댓글 수와 맞아야 한다
  const hiddenCount = countComments(list.slice(0, hiddenRoots));

  const handleReply = (comment: Comment) => {
    setReplyTo({ commentId: comment.id, name: commentAuthorName(comment) });
    inputRef.current?.focus();
  };

  return (
    <div className='flex w-full flex-col gap-4'>
      {isLoading ? (
        <Spinner label='댓글을 불러오는 중' className='py-4' />
      ) : (
        list.length > 0 && (
          <ul className='flex flex-col gap-4' aria-label='댓글'>
            {hiddenRoots > 0 && (
              <li>
                <button
                  type='button'
                  onClick={() => setShowAll(true)}
                  className='text-sm font-medium text-text-subtle hover:text-text-strong'
                >
                  이전 댓글 {hiddenCount}개 보기
                </button>
              </li>
            )}
            {visible.map((comment) => (
              <li key={comment.id}>
                <CommentItem
                  comment={comment}
                  target={target}
                  onReply={handleReply}
                />
                {/* 답글 — 왼쪽 세로선으로 "이 댓글에 달린 말"을 묶는다 */}
                {comment.replies && comment.replies.length > 0 && (
                  <ul className='mt-3 ml-4 flex flex-col gap-3 border-l-2 border-line-soft pl-4'>
                    {comment.replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentItem comment={reply} target={target} isReply />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )
      )}

      {/* 빈 상태는 큰 그림 대신 입력칸 안내 문구가 대신한다. 비회원만 한 줄 안내 */}
      {!isLoading && list.length === 0 && !isUserLoading && !currentUser && (
        <p className='text-sm text-text-subtle'>{emptyText}</p>
      )}

      <CommentComposer
        target={target}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        placeholder={
          list.length === 0 ? '첫 댓글을 남겨 보세요' : placeholder
        }
        inputRef={inputRef}
      />
    </div>
  );
};
