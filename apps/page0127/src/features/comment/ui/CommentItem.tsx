'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MoreVertical, Pencil, Reply, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Textarea } from '@/shared/ui/textarea';

import { Comment, commentApi, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm } from './CommentForm';

type CommentItemProps = {
  comment: Comment;
  activityId: string;
  isReply?: boolean;
};

/**
 * 댓글 아이템 컴포넌트
 *
 * 학습 포인트:
 * - 수정 모드 토글 (useState)
 * - 대댓글 작성 모드 토글
 * - 본인 댓글만 수정/삭제 가능
 * - 상대 시간 표시 (date-fns)
 */
export const CommentItem = ({
  comment,
  activityId,
  isReply = false,
}: CommentItemProps) => {
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUserContext();
  const currentUserId = currentUser?.id ?? null;
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isAuthor = currentUserId === comment.userId;

  // 댓글 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      return await commentApi.updateComment(activityId, comment.id, {
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byActivity(activityId),
      });
      setIsEditing(false);
      toast.success('댓글이 수정되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // 댓글 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await commentApi.deleteComment(activityId, comment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentKeys.byActivity(activityId),
      });
      toast.success('댓글이 삭제되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
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

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ko,
    });
  };

  return (
    <>
      <div className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
        {/* 프로필 사진 */}
        <Avatar className='h-8 w-8'>
          <AvatarImage src={comment.user?.photoUrl || undefined} />
          <AvatarFallback>{comment.user?.nickname?.[0] || '익'}</AvatarFallback>
        </Avatar>

        <div className='flex-1 space-y-2'>
          {/* 댓글 헤더 */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                {comment.user?.nickname || '익명'}
              </span>
              <span className='text-xs text-muted-foreground'>
                {formatTime(comment.createdAt)}
              </span>
              {comment.updatedAt !== comment.createdAt && (
                <span className='text-xs text-muted-foreground'>(수정됨)</span>
              )}
            </div>

            <div className='flex items-center gap-1'>
              {/* 대댓글 버튼 (일반 댓글에만 표시) */}
              {!isReply && currentUserId && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setIsReplying(!isReplying)}
                  className='h-8 px-2 text-xs'
                >
                  <Reply className='mr-1 h-3 w-3' />
                  답글
                </Button>
              )}

              {/* 수정/삭제 메뉴 (본인 댓글만) */}
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
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
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* 댓글 내용 (수정 모드) */}
          {isEditing ? (
            <div className='space-y-2'>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                disabled={updateMutation.isPending}
                className='resize-none'
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
                  disabled={updateMutation.isPending || !editContent.trim()}
                >
                  수정
                </Button>
              </div>
            </div>
          ) : (
            <p className='text-sm text-gray-700 whitespace-pre-wrap'>
              {comment.content}
            </p>
          )}

          {/* 대댓글 작성 폼 */}
          {isReplying && (
            <div className='pt-2'>
              <CommentForm
                activityId={activityId}
                parentCommentId={comment.id}
                onSuccess={() => setIsReplying(false)}
                onCancel={() => setIsReplying(false)}
                placeholder='답글을 입력하세요...'
                submitText='답글 작성'
              />
            </div>
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
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
