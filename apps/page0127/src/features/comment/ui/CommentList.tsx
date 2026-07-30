'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';

import { Spinner } from '@/shared/ui/Spinner';

import { commentApi, commentKeys } from '@/entities/comment';

import { CommentItem } from './CommentItem';

import type { CommentTarget } from '@/entities/comment';

type CommentListProps = {
  target: CommentTarget;
};

/**
 * 댓글 목록 컴포넌트
 *
 * 학습 포인트:
 * - useQuery로 댓글 목록 조회
 * - 계층 구조 렌더링 (댓글 + 대댓글)
 * - 로딩/에러 상태 처리
 */
export const CommentList = ({ target }: CommentListProps) => {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentKeys.byTarget(target),
    queryFn: async () => {
      const result = await commentApi.getComments(target);
      return result;
    },
  });

  if (isLoading) {
    return (
      <Spinner label='댓글을 불러오는 중' className='py-8' />
    );
  }

  if (!comments || comments.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
        <MessageSquare className='mb-2 h-8 w-8' />
        <p className='text-sm'>첫 번째 댓글을 작성해보세요</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {comments.map((comment) => (
        <div key={comment.id} className='space-y-4'>
          {/* 일반 댓글 */}
          <CommentItem comment={comment} target={target} />

          {/* 대댓글들 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className='space-y-4'>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  target={target}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
