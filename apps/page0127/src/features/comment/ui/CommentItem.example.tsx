'use client';

import { UserAvatar } from '@/shared/ui/user-avatar';
import { UserLink } from '@/shared/ui/user-link';

import type { Comment } from '@/entities/comment/types';

type CommentItemProps = {
  comment: Comment;
};

/**
 * 댓글 아이템 컴포넌트 (예시)
 *
 * 학습 포인트:
 * - 탈퇴한 사용자 처리
 * - UserLink와 UserAvatar 컴포넌트 활용
 * - 조건부 렌더링으로 404 에러 방지
 *
 * 사용 예시:
 * ```tsx
 * <CommentItem comment={comment} />
 * ```
 *
 * 탈퇴한 사용자 처리:
 * - comment.user가 null이면 "탈퇴한 사용자"로 표시
 * - 프로필 링크 없이 텍스트만 표시 (404 방지)
 * - 아바타는 기본 이미지로 표시 (흐리게)
 */
export const CommentItem = ({ comment }: CommentItemProps) => {
  // 탈퇴한 사용자 여부 확인
  const isDeletedUser = !comment.user;

  return (
    <div className='flex gap-3 p-4 border-b'>
      {/* 프로필 이미지 */}
      <UserAvatar
        photoUrl={comment.user?.photoUrl || null}
        nickname={comment.user?.nickname || null}
        isDeleted={isDeletedUser}
        size='md'
      />

      <div className='flex-1'>
        {/* 사용자 정보 */}
        <div className='flex items-center gap-2 mb-1'>
          {/* 사용자 링크 (탈퇴한 경우 링크 없음) */}
          <UserLink
            userId={comment.userId}
            username={comment.user?.id || null} // username 필드가 있다면 사용
            nickname={comment.user?.nickname || null}
            className='font-semibold'
          />

          {/* 작성 시간 */}
          <span className='text-sm text-gray-500'>
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* 댓글 내용 */}
        <p className='text-gray-800'>{comment.content}</p>

        {/* 액션 버튼 (답글, 좋아요 등) */}
        <div className='flex gap-4 mt-2'>
          <button className='text-sm text-gray-600 hover:text-blue-600'>
            답글
          </button>
          {/* 탈퇴한 사용자의 댓글은 수정/삭제 불가 */}
          {!isDeletedUser && comment.userId === 'current-user-id' && (
            <>
              <button className='text-sm text-gray-600 hover:text-blue-600'>
                수정
              </button>
              <button className='text-sm text-red-600 hover:text-red-700'>
                삭제
              </button>
            </>
          )}
        </div>

        {/* 대댓글 (있는 경우) */}
        {comment.replies && comment.replies.length > 0 && (
          <div className='mt-4 ml-8 space-y-4'>
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
