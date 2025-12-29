'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, BookCheck, MessageSquare } from 'lucide-react';

import { Activity } from '@/entities/activity';
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
};

const getActivityIcon = (type: Activity['activity_type']) => {
  switch (type) {
    case 'book_added':
      return <BookOpen className='h-5 w-5 text-blue-600' />;
    case 'book_completed':
      return <BookCheck className='h-5 w-5 text-green-600' />;
    case 'review_added':
      return <MessageSquare className='h-5 w-5 text-purple-600' />;
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

export const ActivityCard = ({ activity }: ActivityCardProps) => {
  if (!activity.book) return null;

  return (
    <div className='rounded-lg border bg-white p-4 shadow-sm'>
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
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600'>
            {(activity.user.nickname || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        {/* 사용자 이름 및 활동 */}
        <div className='flex-1'>
          <div className='flex items-center gap-2'>
            <Link
              href={`/${activity.user.nickname || activity.user.id}`}
              className='font-semibold text-gray-900 hover:text-blue-600'
            >
              {activity.user.nickname || '익명'}
            </Link>
            {getActivityIcon(activity.activity_type)}
          </div>
          <p className='text-sm text-gray-600'>
            {getActivityText(activity.activity_type)}
          </p>
        </div>

        {/* 시간 */}
        <span className='text-sm text-gray-500'>
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
          <div className='flex h-32 w-24 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400'>
            <BookOpen className='h-8 w-8' />
          </div>
        )}

        {/* 책 상세 */}
        <div className='flex-1'>
          <h3 className='font-semibold text-gray-900'>{activity.book.title}</h3>
          <p className='text-sm text-gray-600'>{activity.book.author}</p>

          {/* 평점 (완독 시) */}
          {activity.activity_type === 'book_completed' &&
            activity.book.rating && (
              <div className='mt-2 flex items-center gap-1'>
                <span className='text-yellow-500'>⭐</span>
                <span className='text-sm font-medium'>
                  {activity.book.rating}/10
                </span>
              </div>
            )}

          {/* 리뷰 내용 */}
          {activity.activity_type === 'review_added' && activity.content && (
            <p className='mt-2 line-clamp-3 text-sm text-gray-700'>
              {activity.content}
            </p>
          )}
        </div>
      </div>

      {/* 좋아요 버튼 */}
      <div className='mt-3 border-t pt-3'>
        <LikeButton
          activityId={activity.id}
          initialCount={activity.likes.count}
          initialIsLiked={activity.likes.isLiked}
        />
      </div>
    </div>
  );
};
