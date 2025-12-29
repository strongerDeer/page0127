'use client';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

import { commentApi } from '@/entities/comment';

type CommentFormProps = {
  activityId: string;
  parentCommentId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
};

/**
 * 댓글 작성 폼 컴포넌트
 *
 * 학습 포인트:
 * - Textarea 컴포넌트 사용
 * - useMutation으로 댓글 작성
 * - 낙관적 업데이트 대신 성공 후 쿼리 무효화
 * - parentCommentId로 댓글/대댓글 구분
 */
export const CommentForm = ({
  activityId,
  parentCommentId = null,
  onSuccess,
  onCancel,
  placeholder = '댓글을 입력하세요...',
  submitText = '작성',
}: CommentFormProps) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const result = await commentApi.createComment(activityId, {
        content,
        parentCommentId,
      });
      console.log('댓글 작성 성공:', result);
      return result;
    },
    onSuccess: () => {
      console.log('댓글 작성 onSuccess - 쿼리 무효화');
      // 댓글 목록 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['comments', activityId],
      });
      setContent('');
      onSuccess?.();
      toast.success('댓글이 작성되었습니다.');
    },
    onError: (error: Error) => {
      console.error('댓글 작성 실패:', error);
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    createMutation.mutate(content.trim());
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-2'>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={createMutation.isPending}
        className='resize-none'
      />
      <div className='flex justify-end gap-2'>
        {onCancel && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onCancel}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
        )}
        <Button
          type='submit'
          size='sm'
          disabled={createMutation.isPending || !content.trim()}
        >
          {createMutation.isPending && (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          )}
          {submitText}
        </Button>
      </div>
    </form>
  );
};
