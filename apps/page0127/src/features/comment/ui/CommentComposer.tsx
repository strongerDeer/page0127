'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@/shared/api/demoReadOnly';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { cn } from '@/shared/lib/utils';

import { commentApi, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { addOptimisticComment, replaceComment } from '../model/optimisticCache';

import type { Comment, CommentTarget } from '@/entities/comment';

/** 서버 COMMENT_MAX_LENGTH(api/_helpers/bookComments)와 같은 값 */
const COMMENT_MAX_LENGTH = 2000;
/** 남은 글자 수를 보여 주기 시작하는 지점 — 평소엔 숫자가 안 보이게 */
const COUNTER_FROM = 1800;

export type ReplyTarget = { commentId: string; name: string };

type CommentComposerProps = {
  target: CommentTarget;
  /** 답글 대상 — 있으면 입력칸 위에 "OO님에게 답글"을 띄운다 */
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  placeholder?: string;
  /** 바깥(답글 달기 버튼)에서 포커스를 옮길 때 쓴다 */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

/**
 * 댓글 입력칸 — 목록 맨 아래 한 줄
 *
 * 학습 포인트:
 * - 한 줄로 시작해 쓰는 만큼 늘어난다(CSS field-sizing: content). JS 로 높이를 재지 않는다.
 * - 낙관적 업데이트: 남기기를 누르면 목록 캐시에 먼저 붙이고(onMutate), 실패하면
 *   스냅샷으로 되돌린다(onError). 성공 토스트는 띄우지 않는다 — 목록에 이미 보인다.
 * - 답글도 같은 입력칸을 쓴다. 칸이 두 개면 "어디에 쓰고 있는지"를 사용자가 추적해야 한다.
 * - 비회원에게는 입력칸 대신 로그인 버튼. 로그인 뒤 지금 페이지로 돌아온다.
 */
export const CommentComposer = ({
  target,
  replyTo = null,
  onCancelReply,
  placeholder = '댓글 남기기…',
  inputRef,
}: CommentComposerProps) => {
  const { currentUser, isLoading } = useCurrentUserContext();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [content, setContent] = useState('');
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localRef;
  const queryKey = commentKeys.byTarget(target);

  // 답글 대상이 바뀌면 바로 쓸 수 있게 포커스
  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo, ref]);

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      commentApi.createComment(target, {
        content: text,
        parentCommentId: replyTo?.commentId ?? null,
      }),
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<Comment[]>(queryKey);
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const temp: Comment = {
        id: tempId,
        userId: currentUser?.id ?? null,
        parentCommentId: replyTo?.commentId ?? null,
        content: text,
        createdAt: now,
        updatedAt: now,
        // 서버 응답 전까지 이름은 "나" — 응답이 오면 진짜 프로필로 바꾼다
        user: currentUser
          ? { id: currentUser.id, nickname: '나', username: null, photoUrl: null }
          : null,
        replies: [],
      };
      if (previous) {
        queryClient.setQueryData(
          queryKey,
          addOptimisticComment(previous, temp)
        );
      }
      setContent('');
      return { previous, tempId, text };
    },
    onSuccess: (created, _text, context) => {
      queryClient.setQueryData<Comment[]>(queryKey, (old) =>
        old ? replaceComment(old, context.tempId, created) : old
      );
      // 내용은 보내지 않는다 — 답글인지만
      trackEvent('comment_post', {
        on: target.type,
        reply: replyTo !== null,
      });
      onCancelReply?.();
    },
    onError: (error, _text, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      // 쓴 글은 돌려준다 — 실패했다고 글까지 잃으면 다시 쓸 마음이 사라진다
      if (context?.text) setContent(context.text);
      toastApiError(error, '댓글을 남기지 못했어요. 다시 눌러 주세요.');
    },
    onSettled: () => {
      // 개수·스트림 등 같은 대상을 보는 다른 쿼리도 같이 새로 받는다(접두사 무효화)
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // 로그인 확인 중엔 아무것도 그리지 않는다 — 로그인 버튼이 번쩍였다 사라지지 않게
  if (isLoading) return null;

  if (!currentUser) {
    return (
      <Button asChild variant='outline' className='w-full rounded-full'>
        <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
          로그인하고 댓글 남기기
        </Link>
      </Button>
    );
  }

  const trimmed = content.trim();

  const submit = () => {
    if (!trimmed) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }
    if (createMutation.isPending) return;
    createMutation.mutate(trimmed);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className='flex flex-col gap-1.5'
    >
      {replyTo && (
        <p className='flex items-center gap-2 px-1 text-xs'>
          <span className='font-medium text-primary'>
            {replyTo.name}님에게 답글
          </span>
          <button
            type='button'
            onClick={onCancelReply}
            className='text-text-subtle underline-offset-2 hover:underline'
          >
            취소
          </button>
        </p>
      )}
      <div
        className={cn(
          'flex items-end gap-2 rounded-3xl border border-line bg-background py-1.5 pr-1.5 pl-4',
          'focus-within:border-primary'
        )}
      >
        <label htmlFor={`comment-${target.type}-${target.id}`} className='sr-only'>
          {replyTo ? `${replyTo.name}님에게 답글` : '댓글'}
        </label>
        <textarea
          id={`comment-${target.type}-${target.id}`}
          ref={ref}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // ⌘/Ctrl+Enter 로 남기기. Enter 만으로 보내면 줄바꿈을 못 해서 긴 감상을 못 쓴다.
            // 한글 조합 중(isComposing)엔 무시 — 마지막 글자가 두 번 들어가는 걸 막는다.
            if (
              e.key === 'Enter' &&
              (e.metaKey || e.ctrlKey) &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
            if (e.key === 'Escape' && replyTo) onCancelReply?.();
          }}
          placeholder={replyTo ? '답글 남기기…' : placeholder}
          rows={1}
          maxLength={COMMENT_MAX_LENGTH}
          className={cn(
            '[field-sizing:content] max-h-48 min-h-8 flex-1 resize-none bg-transparent py-1 text-base leading-6 text-text-strong outline-none',
            'placeholder:text-text-subtle md:text-sm'
          )}
        />
        <Button
          type='submit'
          size='sm'
          className='shrink-0 rounded-full'
          disabled={!trimmed}
          loading={createMutation.isPending}
        >
          남기기
        </Button>
      </div>
      {content.length >= COUNTER_FROM && (
        <p className='px-1 text-right text-xs text-text-subtle tabular-nums'>
          {content.length} / {COMMENT_MAX_LENGTH}
        </p>
      )}
    </form>
  );
};
