import Image from 'next/image';
import Link from 'next/link';

import { Star } from 'lucide-react';
import { BookCheck, BookOpen, MessageSquare } from 'lucide-react';

import { Activity } from '@/entities/activity';

import { CommentSection } from '@/features/comment';
import { LikeButton } from '@/features/like';

/**
 * 활동 카드 컴포넌트
 *
 * 학습 포인트:
 * - 활동 타입별 다른 UI 표시
 * - 상대 시간 표시 (예: "3시간 전")
 * - 조건부 렌더링
 */
type ActivityCardProps = {
  activity: Activity;
  initialCommentsOpen?: boolean; // 댓글 섹션 초기 펼침 상태
};

// 활동 타입별 의미 색은 차트 팔레트로 통일 (인디고 베이스 + 보조 파스텔)
const getActivityIcon = (type: Activity['activity_type']) => {
  switch (type) {
    case 'book_added':
      return <BookOpen className='h-5 w-5 text-chart-1' />;
    case 'book_completed':
      return <BookCheck className='h-5 w-5 text-chart-3' />;
    case 'review_added':
      return <MessageSquare className='h-5 w-5 text-chart-2' />;
  }
};

const getActivityText = (type: Activity['activity_type']) => {
  switch (type) {
    case 'book_added':
      return '새로운 책을 추가했습니다';
    case 'book_completed':
      return '책을 완독했습니다';
    case 'review_added':
      return '리뷰를 작성했습니다';
  }
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
};

export const ActivityCard = ({
  activity,
  initialCommentsOpen = false,
}: ActivityCardProps) => {
  if (!activity.book) return null;

  return (
    <div className='rounded-lg border border-border bg-card p-4'>
      {/* 사용자 정보 및 활동 타입 */}
      <div className='mb-3 flex items-center gap-3'>
        {/* 프로필 이미지 */}
        {activity.user.photo_url ? (
          <div className='relative h-10 w-10 overflow-hidden rounded-full'>
            <Image
              src={activity.user.photo_url}
              alt={activity.user.nickname || '사용자'}
              fill
              sizes='40px'
              className='object-cover'
            />
          </div>
        ) : (
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground'>
            {(activity.user.nickname || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        {/* 사용자 이름 및 활동 */}
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <Link
              href={`/${activity.user.nickname || activity.user.id}`}
              className='font-semibold text-foreground hover:text-primary'
            >
              {activity.user.nickname || '익명'}
            </Link>
            {getActivityIcon(activity.activity_type)}
          </div>
          <p className='text-sm text-muted-foreground'>
            {getActivityText(activity.activity_type)}
          </p>
        </div>

        {/* 시간 */}
        <span className='text-sm text-muted-foreground'>
          {getRelativeTime(activity.created_at)}
        </span>
      </div>

      {/* 책 정보 */}
      <div className='flex gap-3'>
        {/* 책 표지 */}
        {activity.book.cover_image ? (
          <div className='relative h-32 w-24 flex-shrink-0 overflow-hidden rounded'>
            <Image
              src={activity.book.cover_image}
              alt={activity.book.title}
              fill
              sizes='96px'
              className='object-cover'
            />
          </div>
        ) : (
          <div className='flex h-32 w-24 flex-shrink-0 items-center justify-center rounded bg-muted text-muted-foreground'>
            <BookOpen className='h-8 w-8' />
          </div>
        )}

        {/* 책 상세 */}
        <div className='flex-1'>
          <h3 className='font-semibold text-foreground'>{activity.book.title}</h3>
          <p className='text-sm text-muted-foreground'>{activity.book.author}</p>

          {/* 평점 (완독 시) */}
          {activity.activity_type === 'book_completed' &&
            activity.book.rating && (
              <div className='mt-2 flex items-center gap-1'>
                <Star className='h-3.5 w-3.5 fill-chart-4 text-chart-4' />
                <span className='text-sm font-medium text-text-body'>
                  {activity.book.rating}/10
                </span>
              </div>
            )}

          {/* 리뷰 내용 */}
          {activity.activity_type === 'review_added' && activity.content && (
            <p className='mt-2 line-clamp-3 text-sm text-muted-foreground'>
              {activity.content}
            </p>
          )}
        </div>
      </div>

      {/* 좋아요 및 댓글 */}
      <div className='mt-3 space-y-3 border-t pt-3'>
        <LikeButton
          activityId={activity.id}
          count={activity.likes.count}
          isLiked={activity.likes.isLiked}
        />

        {/* 댓글 섹션 */}
        <CommentSection
          activityId={activity.id}
          initialOpen={initialCommentsOpen}
        />
      </div>
    </div>
  );
};
