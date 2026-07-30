'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { commentApi, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm, CommentItem } from '@/features/comment';

import type { CommentTarget } from '@/entities/comment';

type GlobalBookCommentSectionProps = {
  globalBookId: string;
};

/**
 * 전역 책 스레드 — 순수 댓글만
 *
 * 학습 포인트:
 * - 개인 책 스트림과 달리 활동 마커가 없다. 전역 책은 여러 사람이 담는 "책 그 자체"라
 *   특정 사용자의 상태 변화(담음·완독)가 존재하지 않는다.
 * - 대상만 globalBook으로 넘기면 commentApi가 알아서 전역 엔드포인트로 간다
 *   (계획 1에서 CommentTarget 구별 유니온을 만들어 둔 덕이다).
 */
export const GlobalBookCommentSection = ({
  globalBookId,
}: GlobalBookCommentSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'globalBook', id: globalBookId };

  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentKeys.byTarget(target),
    queryFn: () => commentApi.getComments(target),
  });

  const totalCount = comments.reduce(
    (count, comment) => count + 1 + (comment.replies?.length ?? 0),
    0
  );

  return (
    <section className='border-t border-line pt-6'>
      <h2 className='heading-2'>이 책 이야기 {totalCount}</h2>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='size-6 animate-spin text-muted-foreground' />
        </div>
      ) : comments.length === 0 ? (
        <p className='mt-4 rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이야기가 없어요. 먼저 남겨보세요.
        </p>
      ) : (
        <div className='mt-4 space-y-3'>
          {comments.map((comment) => (
            <div key={comment.id} className='space-y-3'>
              <CommentItem comment={comment} target={target} />
              {comment.replies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  target={target}
                  isReply
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {currentUser && (
        <div className='mt-4 border-t border-line-soft pt-4'>
          <CommentForm target={target} placeholder='이 책에 대해 남기기…' />
        </div>
      )}
    </section>
  );
};
