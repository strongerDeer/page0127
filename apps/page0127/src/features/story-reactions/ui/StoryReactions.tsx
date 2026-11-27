'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@repo/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';

import { toastApiError } from '@/shared/api/demoReadOnly';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { cn } from '@/shared/lib/utils';

import { useCurrentUserContext } from '@/entities/user';

import { CommentThread, useCommentCount } from '@/features/comment';

import { storyLikeApi, storyLikeKeys } from '../api/storyLikeApi';

import type { StoryLikeState } from '../api/storyLikeApi';
import type { CommentTarget } from '@/entities/comment';

type StoryReactionsProps = {
  storyId: string;
};

/**
 * 책 이야기 글 끝의 반응 — 좋아요 + "이 글에 남긴 말"(댓글)
 *
 * 학습 포인트:
 * - 이 페이지는 ISR(미리 만든 HTML)이라 서버에서 로그인을 읽지 않는다. 좋아요 수·내 상태·
 *   댓글은 전부 브라우저에서 따로 받는다 — 책 정보 페이지 댓글과 같은 방식.
 * - 좋아요는 낙관적 업데이트: 누르는 순간 숫자를 바꾸고, 실패하면 되돌린다.
 *   서버 응답이 "지금 상태"를 통째로 주므로 성공하면 그 값으로 덮어 어긋남을 없앤다.
 * - 비회원이 하트를 누르면 로그인으로 보낸다(돌아올 주소 포함). 검색으로 온 독자가 대부분이다.
 */
export const StoryReactions = ({ storyId }: StoryReactionsProps) => {
  const target: CommentTarget = { type: 'story', id: storyId };
  const commentCount = useCommentCount(target, 0);

  return (
    <section
      aria-labelledby='story-talk'
      className='flex scroll-mt-20 flex-col gap-5 border-t border-line pt-8'
      id='talk'
    >
      <div className='flex items-center justify-between gap-3'>
        <h2 id='story-talk' className='heading-2'>
          이 글에 남긴 말
          {commentCount > 0 && (
            <span className='ml-2 text-text-subtle tabular-nums'>
              {commentCount}
            </span>
          )}
        </h2>
        <StoryLikeButton storyId={storyId} />
      </div>
      <CommentThread
        target={target}
        placeholder='이 글에 대해 남기기…'
        emptyText='아직 이 글에 남긴 말이 없어요.'
      />
    </section>
  );
};

const StoryLikeButton = ({ storyId }: { storyId: string }) => {
  const { currentUser, isLoading: isUserLoading } = useCurrentUserContext();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const queryKey = storyLikeKeys.byStory(storyId);

  const { data } = useQuery({
    queryKey,
    queryFn: () => storyLikeApi.get(storyId),
    // 로그인 상태가 정해진 뒤에 받는다 — 비회원 값으로 받았다가 다시 받지 않게
    enabled: !isUserLoading,
  });
  const count = data?.count ?? 0;
  const isLiked = data?.isLiked ?? false;

  const mutation = useMutation({
    mutationFn: (liked: boolean) =>
      liked ? storyLikeApi.unlike(storyId) : storyLikeApi.like(storyId),
    onMutate: async (liked) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<StoryLikeState>(queryKey);
      queryClient.setQueryData<StoryLikeState>(queryKey, {
        count: Math.max(0, (previous?.count ?? 0) + (liked ? -1 : 1)),
        isLiked: !liked,
      });
      return { previous };
    },
    onSuccess: (state, liked) => {
      queryClient.setQueryData(queryKey, state);
      if (!liked) trackEvent('like_add');
    },
    onError: (error, _liked, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toastApiError(error, '좋아요에 실패했습니다.');
    },
  });

  const content = (
    <>
      <Heart
        aria-hidden
        className={cn('size-4', isLiked && 'fill-red-500 text-red-500')}
      />
      <span className='sr-only'>좋아요</span>
      <span className='tabular-nums'>{count}</span>
    </>
  );

  if (!isUserLoading && !currentUser) {
    return (
      <Button asChild variant='outline' size='sm' className='gap-2 rounded-full'>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          aria-label={`좋아요 ${count} — 로그인하고 누르기`}
        >
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant='outline'
      size='sm'
      className='gap-2 rounded-full'
      aria-pressed={isLiked}
      disabled={isUserLoading || mutation.isPending}
      onClick={() => mutation.mutate(isLiked)}
    >
      {content}
    </Button>
  );
};
