'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm, CommentItem } from '@/features/comment';

import { BookStreamEvent } from './BookStreamEvent';

import type { Comment, CommentTarget } from '@/entities/comment';

type StreamActivity = {
  kind: 'activity';
  id: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
};

type StreamComment = Comment & { kind: 'comment' };

type StreamItem = StreamActivity | StreamComment;

type BookStreamSectionProps = {
  bookId: string;
  rating?: number | null;
};

/**
 * 책 상세의 "이 책의 기록" — 상태 변화와 댓글이 시간순으로 섞인 하나의 줄기
 *
 * 학습 포인트:
 * - 스트림 쿼리와 댓글 쿼리가 같은 데이터를 본다. 댓글을 쓰면 CommentForm이
 *   commentKeys.byTarget을 무효화하므로, 여기서도 같은 키를 쿼리 키에 포함시켜
 *   한 번의 무효화로 둘 다 갱신되게 한다.
 */
export const BookStreamSection = ({
  bookId,
  rating,
}: BookStreamSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'book', id: bookId };

  const { data, isLoading } = useQuery({
    queryKey: [...commentKeys.byTarget(target), 'stream'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        items: StreamItem[];
        hasMore: boolean;
      }>(API_ENDPOINTS.books.stream(bookId));
      return data;
    },
  });

  const items = data?.items ?? [];

  return (
    <section className='mt-6'>
      <h2 className='heading-2 mb-3 text-text-strong'>이 책의 기록</h2>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='size-6 animate-spin text-muted-foreground' />
        </div>
      ) : items.length === 0 ? (
        <p className='rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이 책의 기록이 없어요.
        </p>
      ) : (
        <div className='space-y-3 border-t border-line-soft pt-4'>
          {items.map((item) =>
            item.kind === 'activity' ? (
              <BookStreamEvent
                key={item.id}
                activityType={item.activityType}
                content={item.content}
                createdAt={item.createdAt}
                rating={rating}
              />
            ) : (
              <div key={item.id} className='space-y-3'>
                <CommentItem comment={item} target={target} />
                {item.replies?.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    target={target}
                    isReply
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {currentUser && (
        <div className='mt-4 border-t border-line-soft pt-4'>
          <CommentForm target={target} placeholder='이 책에 댓글 남기기…' />
        </div>
      )}
    </section>
  );
};
