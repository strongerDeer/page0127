'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import { commentApi } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';

type CommentSectionProps = {
  activityId: string;
  initialOpen?: boolean; // 초기 펼침 상태
};

/**
 * 댓글 섹션 컴포넌트
 *
 * 학습 포인트:
 * - 댓글 목록 표시/숨김 토글
 * - 댓글 작성 폼과 목록 통합
 * - 로그인 여부에 따른 조건부 렌더링
 * - 댓글 개수를 실시간으로 업데이트
 */
export const CommentSection = ({
  activityId,
  initialOpen = false,
}: CommentSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const currentUserId = currentUser?.id ?? null;
  const [isExpanded, setIsExpanded] = useState(initialOpen);

  // 댓글 개수 조회
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', activityId],
    queryFn: () => commentApi.getComments(activityId),
  });

  // useMemo 불필요: comments가 바뀌면 어차피 다시 계산해야 하고,
  // 댓글 수십 개를 더하는 연산은 매우 빠르다 → 캐싱 비용이 이득보다 크다
  const totalCount = comments.reduce(
    (count, comment) => count + 1 + (comment.replies?.length || 0),
    0
  );

  return (
    <div className='space-y-3'>
      {/* 댓글 토글 버튼 */}
      <Button
        variant='ghost'
        size='sm'
        onClick={() => setIsExpanded(!isExpanded)}
        className='gap-2'
      >
        <MessageSquare className='h-4 w-4' />
        <span className='text-sm text-muted-foreground'>
          댓글 {totalCount}개
        </span>
      </Button>

      {/* 댓글 영역 */}
      {isExpanded && (
        <div className='space-y-4 border-t pt-4'>
          {/* 댓글 작성 폼 (로그인한 경우만) */}
          {currentUserId && (
            <div className='pb-4 border-b'>
              <CommentForm activityId={activityId} />
            </div>
          )}

          {/* 댓글 목록 */}
          <CommentList activityId={activityId} />
        </div>
      )}
    </div>
  );
};
