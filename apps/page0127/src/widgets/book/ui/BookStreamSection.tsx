'use client';

import { useEffect, useMemo, useState } from 'react';

import { StatePanel } from '@repo/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import {
  commentAuthorName,
  CommentComposer,
  CommentItem,
} from '@/features/comment';

import { BookStreamEvent } from './BookStreamEvent';

import type { Comment, CommentTarget } from '@/entities/comment';
import type { ReplyTarget } from '@/features/comment';

type StreamActivity = {
  kind: 'activity';
  id: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
};

type StreamComment = Comment & { kind: 'comment' };

type StreamItem = StreamActivity | StreamComment;

type StreamPage = {
  items: StreamItem[];
  hasMore: boolean;
};

type BookStreamSectionProps = {
  bookId: string;
  rating?: number | null;
  /** 인생책 여부 — rating 과 별개 컬럼이다 */
  isLifeBook?: boolean;
};

/**
 * ISO 8601 시각 비교
 *
 * 학습 포인트: `localeCompare`는 로케일 대조라 '.'을 무시할 수 있어, 소수부가 있는
 * 시각과 없는 시각을 비교하면 순서가 뒤집힌다(서버 `compareIsoTime`과 같은 규칙).
 */
const compareIsoTime = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 책 상세의 "이 책의 기록" — 상태 변화와 댓글이 시간순으로 섞인 하나의 줄기
 *
 * 학습 포인트:
 * - 스트림 쿼리와 댓글 쿼리가 같은 데이터를 본다. 댓글을 쓰면 CommentForm이
 *   commentKeys.byTarget을 무효화하므로, 여기서도 같은 키를 쿼리 키에 포함시켜
 *   한 번의 무효화로 둘 다 갱신되게 한다.
 * - 커서(before)는 댓글에만 걸린다. 활동은 한 책당 몇 개뿐이라 페이지마다 전부 실려
 *   오므로, 페이지를 이어붙일 때 id로 중복을 걷어내고 다시 시간순으로 세운다.
 */
export const BookStreamSection = ({
  bookId,
  rating,
  isLifeBook,
}: BookStreamSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'book', id: bookId };
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [...commentKeys.byTarget(target), 'stream'],
      queryFn: async ({ pageParam }) => {
        const { data } = await apiClient.get<StreamPage>(
          API_ENDPOINTS.books.stream(bookId),
          { params: pageParam ? { before: pageParam } : undefined }
        );
        return data;
      },
      initialPageParam: undefined as string | undefined,
      // 다음 커서는 이번 페이지에서 가장 오래된 댓글의 시각.
      // items가 내림차순(최신이 위)이므로 마지막 댓글이 그 기준이다.
      getNextPageParam: (lastPage) => {
        if (!lastPage.hasMore) return undefined;
        const comments = lastPage.items.filter(
          (item) => item.kind === 'comment'
        );
        return comments.at(-1)?.createdAt;
      },
    });

  const items = useMemo(() => {
    const byId = new Map<string, StreamItem>();
    for (const page of data?.pages ?? []) {
      for (const item of page.items) byId.set(item.id, item);
    }

    // 오래된 것이 위(오름차순) — 대화처럼 위에서 아래로 읽고, 입력칸은 맨 아래(HJ, 2026-11-27).
    // 서버는 페이지를 최신부터 잘라 주므로(커서) 화면에서만 뒤집는다.
    return [...byId.values()].sort((a, b) => {
      const diff = compareIsoTime(a.createdAt, b.createdAt);
      if (diff !== 0) return diff;
      // 같은 시각이면 활동을 위에 — "완독했어요" 다음에 그에 달린 댓글이 온다
      if (a.kind === b.kind) return 0;
      return a.kind === 'activity' ? -1 : 1;
    });
  }, [data]);

  // 스트림을 실제로 받아온 뒤에만 "읽었다"고 기록한다.
  // 못 본 것을 봤다고 표시하면 안 되므로 로딩 중·실패 시에는 기록하지 않는다.
  const loaded = !isLoading && data !== undefined;
  useEffect(() => {
    if (!currentUser || !loaded) return;
    apiClient.post(API_ENDPOINTS.books.threadRead(bookId)).catch(() => {
      // 배지 갱신 실패는 읽기를 막을 이유가 아니다 — 조용히 넘긴다
    });
  }, [bookId, currentUser, loaded]);

  return (
    <section className='mt-6'>
      <h2 className='heading-2 mb-3'>이 책의 기록</h2>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='size-6 animate-spin text-muted-foreground' />
        </div>
      ) : items.length === 0 ? (
        <StatePanel message='아직 이 책의 기록이 없어요.' />
      ) : (
        <ul className='flex flex-col gap-4 border-t border-line-soft pt-4'>
          {/* 오래된 것이 위라, 과거로 가는 더보기는 목록 맨 위에 둔다 */}
          {hasNextPage && (
            <li>
              <button
                type='button'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className='inline-flex items-center text-sm font-medium text-text-subtle hover:text-text-strong'
              >
                {isFetchingNextPage && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                이전 기록 더 보기
              </button>
            </li>
          )}
          {items.map((item) =>
            item.kind === 'activity' ? (
              <li key={item.id}>
                <BookStreamEvent
                  activityType={item.activityType}
                  content={item.content}
                  createdAt={item.createdAt}
                  rating={rating}
                  isLifeBook={isLifeBook}
                />
              </li>
            ) : (
              <li key={item.id}>
                <CommentItem
                  comment={item}
                  target={target}
                  onReply={(c) =>
                    setReplyTo({ commentId: c.id, name: commentAuthorName(c) })
                  }
                />
                {item.replies && item.replies.length > 0 && (
                  <ul className='mt-3 ml-4 flex flex-col gap-3 border-l-2 border-line-soft pl-4'>
                    {item.replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentItem comment={reply} target={target} isReply />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          )}
        </ul>
      )}

      <div className='mt-4'>
        <CommentComposer
          target={target}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          placeholder='이 책에 댓글 남기기…'
        />
      </div>
    </section>
  );
};
