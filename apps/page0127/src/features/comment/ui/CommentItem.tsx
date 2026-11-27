'use client';

import { useState } from 'react';

import { Button } from '@repo/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Textarea,
} from '@repo/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { toastApiError } from '@/shared/api/demoReadOnly';
import { cn } from '@/shared/lib/utils';
import { RelativeTime } from '@/shared/ui/RelativeTime';

import { Comment, commentApi, commentKeys } from '@/entities/comment';
import { nameInitials } from '@/entities/profile/model/displayName';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';
import { useCurrentUserContext } from '@/entities/user';

import { ReportCommentDialog } from '@/features/report/ui/ReportCommentDialog';

import { isPendingComment } from '../model/optimisticCache';

import type { CommentTarget } from '@/entities/comment';

type CommentItemProps = {
  comment: Comment;
  target: CommentTarget;
  isReply?: boolean;
  /** 주면 루트 댓글 아래에 "답글 달기"가 생긴다 — 입력칸은 목록 맨 아래 하나를 같이 쓴다 */
  onReply?: (comment: Comment) => void;
};

/** 탈퇴한 회원(user=null)은 "익명"이 아니라 탈퇴했다고 그대로 보여 준다 */
export const commentAuthorName = (comment: Comment) =>
  comment.user ? comment.user.nickname || '이름 없음' : '탈퇴한 회원';

/**
 * 댓글 한 개
 *
 * 학습 포인트:
 * - 수정 모드 토글 (useState)
 * - 답글은 여기서 입력칸을 열지 않는다. onReply 로 "누구에게"만 올려 보내고,
 *   목록 맨 아래 입력칸 하나가 받는다(입력칸이 두 개면 어디에 쓰는지 헷갈린다).
 * - 본인 댓글만 수정/삭제, 남의 댓글은 신고 — 같은 ⋮ 메뉴 자리
 * - 서버 저장 전(낙관적) 댓글은 흐리게, 메뉴 없이
 */
export const CommentItem = ({
  comment,
  target,
  isReply = false,
  onReply,
}: CommentItemProps) => {
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUserContext();
  const currentUserId = currentUser?.id ?? null;
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isAuthor = currentUserId === comment.userId;
  const isPending = isPendingComment(comment);
  const name = commentAuthorName(comment);

  // 댓글 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      return await commentApi.updateComment(target, comment.id, {
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byTarget(target),
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toastApiError(error, '댓글 수정에 실패했습니다.');
    },
  });

  // 댓글 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await commentApi.deleteComment(target, comment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byTarget(target),
      });
      toast.success('댓글을 지웠어요.');
    },
    onError: (error) => {
      toastApiError(error, '댓글 삭제에 실패했습니다.');
    },
  });

  const handleUpdate = () => {
    if (!editContent.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    updateMutation.mutate(editContent.trim());
  };

  const handleDelete = () => setIsDeleteDialogOpen(true);

  return (
    <>
      <div
        className={cn(
          'flex gap-3',
          isReply && 'gap-2.5',
          isPending && 'opacity-60'
        )}
        aria-busy={isPending || undefined}
      >
        {/* 프로필 사진 — 탈퇴한 사용자(user=null)나 username 이 없으면 링크를 걸지 않는다 */}
        <ProfileLink
          username={comment.user?.username ?? null}
          className='shrink-0'
          aria-label={`${name}의 서재`}
        >
          <Avatar className={isReply ? 'size-6' : 'size-8'}>
            <AvatarImage src={comment.user?.photoUrl || undefined} alt='' />
            <AvatarFallback className={isReply ? 'text-[10px]' : 'text-xs'}>
              {comment.user?.nickname ? nameInitials(comment.user.nickname) : '?'}
            </AvatarFallback>
          </Avatar>
        </ProfileLink>

        <div className='min-w-0 flex-1'>
          {/* 이름 · 시간 · (수정됨)            ⋮ */}
          <div className='flex items-start gap-2'>
            <p className='flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 text-xs text-text-subtle'>
              <ProfileLink
                username={comment.user?.username ?? null}
                className={cn(
                  'text-sm font-medium',
                  comment.user ? 'text-text-strong hover:underline' : 'text-text-subtle'
                )}
              >
                {name}
              </ProfileLink>
              {isPending ? (
                <span>남기는 중…</span>
              ) : (
                <RelativeTime date={comment.createdAt} />
              )}
              {comment.updatedAt !== comment.createdAt && <span>· 수정됨</span>}
            </p>

            {/* 본인 댓글이면 수정·삭제, 남의 댓글이면 신고.
                같은 자리·같은 아이콘이라 사용자는 "이 댓글에 할 수 있는 일"을
                한 곳에서 찾는다. 비로그인·저장 전 댓글은 메뉴가 없다. */}
            {currentUserId && !isPending && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='-mt-1 -mr-1 size-7 shrink-0 p-0 text-text-subtle'
                    aria-label={`${name}님 댓글 메뉴`}
                  >
                    <MoreVertical className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {isAuthor ? (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className='mr-2 h-4 w-4' />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className='text-destructive'
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        삭제
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setIsReportOpen(true)}
                      className='text-destructive'
                    >
                      <Flag className='mr-2 h-4 w-4' />
                      신고
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* 댓글 내용 (수정 모드) */}
          {isEditing ? (
            <div className='mt-1.5 space-y-2'>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                // 서버 COMMENT_MAX_LENGTH(api/_helpers/bookComments)와 같은 값
                maxLength={2000}
                disabled={updateMutation.isPending}
                className='min-h-0 resize-none [field-sizing:content]'
                aria-label='댓글 고치기'
                autoFocus
              />
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  disabled={updateMutation.isPending}
                >
                  취소
                </Button>
                <Button
                  size='sm'
                  onClick={handleUpdate}
                  disabled={!editContent.trim()}
                  loading={updateMutation.isPending}
                >
                  저장
                </Button>
              </div>
            </div>
          ) : (
            <p className='mt-0.5 text-sm leading-6 break-keep whitespace-pre-wrap text-text-body'>
              {comment.content}
            </p>
          )}

          {/* 답글 달기 — 루트 댓글에만(답글은 1단계까지). 글자 버튼이라 자리를 거의 안 먹는다 */}
          {!isReply && onReply && currentUserId && !isPending && !isEditing && (
            <button
              type='button'
              onClick={() => onReply(comment)}
              className='mt-1 text-xs font-medium text-text-subtle hover:text-text-strong'
            >
              답글 달기
            </button>
          )}
        </div>
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>댓글을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 댓글은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              variant='destructive'
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 신고는 남의 댓글에만 뜬다 — 본인 댓글이면 메뉴에 항목 자체가 없다 */}
      {!isAuthor && (
        <ReportCommentDialog
          commentId={comment.id}
          commentType={target.type === 'story' ? 'story' : 'book'}
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}
    </>
  );
};
