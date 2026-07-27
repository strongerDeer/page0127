'use client';

import { useEffect, useMemo } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';
import { Button } from '@/shared/ui/button';

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

type StreamPage = {
  items: StreamItem[];
  hasMore: boolean;
};

type BookStreamSectionProps = {
  bookId: string;
  rating?: number | null;
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
}: BookStreamSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'book', id: bookId };

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

    // 최신이 위(내림차순) — 서버와 같은 규칙이다
    return [...byId.values()].sort((a, b) => {
      const diff = compareIsoTime(b.createdAt, a.createdAt);
      if (diff !== 0) return diff;
      // 같은 시각이면 활동을 아래에 — 위에서 아래로 과거를 향하므로,
      // "완독했어요"가 그에 달린 댓글보다 아래에 오는 게 자연스럽다
      if (a.kind === b.kind) return 0;
      return a.kind === 'activity' ? 1 : -1;
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

          {/* 최신이 위에 오므로, 과거로 내려가는 더보기는 목록 맨 아래에 둔다 */}
          {hasNextPage && (
            <div className='flex justify-center pt-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                이전 댓글 더보기
              </Button>
            </div>
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
