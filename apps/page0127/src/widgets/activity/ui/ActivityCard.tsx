import Image from 'next/image';
import Link from 'next/link';

import { Star } from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

import { Activity } from '@/entities/activity';

import { CommentSection } from '@/features/comment';
import { LikeButton } from '@/features/like';

/**
 * 활동 카드 컴포넌트
 *
 * 디자인:
 * - "누가 · 무엇을 · 언제"를 헤더 한 줄로 압축한다 (기존: 두 줄 + 색 아이콘)
 * - 책은 본문이 아니라 "첨부" — 흰색 보더 모듈에 표지와 정보를 담는다.
 * - 좋아요·댓글은 한 줄의 액션 바로 (기존: 세로로 쌓여 카드가 길어졌다)
 * - 시간은 RelativeTime(<time> 시맨틱) 공용 컴포넌트 하나만 쓴다
 */
type ActivityCardProps = {
  activity: Activity;
  initialCommentsOpen?: boolean; // 댓글 섹션 초기 펼침 상태
};

const getActivityText = (type: Activity['activity_type']) => {
  switch (type) {
    case 'book_added':
      return '책장에 담았어요';
    case 'book_completed':
      return '완독했어요';
    case 'review_added':
      return '리뷰를 남겼어요';
  }
};

export const ActivityCard = ({
  activity,
  initialCommentsOpen = false,
}: ActivityCardProps) => {
  if (!activity.book) return null;

  return (
    // 테두리 카드가 아니라 구분선 리스트의 한 항목 — 부모(ActivityFeed)가 divide-y를 건다
    <article className='py-7'>
      {/* 헤더 — 누가 · 무엇을 · 언제, 한 줄 */}
      <div className='flex items-center gap-3'>
        {activity.user.photo_url ? (
          <div className='relative size-11 shrink-0 overflow-hidden rounded-full'>
            <Image
              src={activity.user.photo_url}
              alt=''
              fill
              sizes='44px'
              className='object-cover'
            />
          </div>
        ) : (
          <div className='flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground'>
            {(activity.user.nickname || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        <p className='min-w-0 flex-1 truncate text-base'>
          <Link
            href={`/${activity.user.nickname || activity.user.id}`}
            className='font-semibold text-text-strong hover:underline'
          >
            {activity.user.nickname || '익명'}
          </Link>
          <span className='ml-1.5 text-text-subtle'>
            {getActivityText(activity.activity_type)}
          </span>
        </p>

        <RelativeTime
          date={activity.created_at}
          className='shrink-0 text-sm text-text-faint'
        />
      </div>

      {/* 책 첨부 — 작은 표지 + 제목·저자·별점 */}
      <div className='mt-4 flex items-center gap-4 rounded-xl border border-line-soft bg-card p-4'>
        {activity.book.cover_image ? (
          <Image
            src={activity.book.cover_image}
            alt=''
            width={64}
            height={96}
            className='book-cover h-24 w-16 shrink-0 object-cover'
          />
        ) : (
          <span className='book-cover flex h-24 w-16 shrink-0 items-center justify-center bg-sunken p-2 text-center text-[10px] leading-tight text-text-faint'>
            {activity.book.title.slice(0, 10)}
          </span>
        )}

        <div className='min-w-0 flex-1'>
          <p className='truncate text-base font-semibold text-text-strong'>
            {activity.book.title}
          </p>
          <p className='mt-1 truncate text-sm text-text-subtle'>
            {activity.book.author}
          </p>
        </div>

        {/* 평점 (완독 시) — 첨부 우측에 정렬 */}
        {activity.activity_type === 'book_completed' &&
          activity.book.rating && (
            <p className='flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-body'>
              <Star
                aria-hidden='true'
                className='size-3.5 fill-rank-up text-rank-up'
              />
              {activity.book.rating}
            </p>
          )}
      </div>

      {/* 리뷰 내용 — 유저가 쓴 글은 다듬지 않고 그대로 보여준다 */}
      {activity.activity_type === 'review_added' && activity.content && (
        <p className='mt-4 line-clamp-3 break-keep text-[15px] leading-7 text-text-body'>
          {activity.content}
        </p>
      )}

      {/* 액션 바 — 좋아요·댓글 한 줄. 댓글 패널은 w-full로 줄바꿈해 전체 폭 사용.
          리스트 구분선과 겹치므로 자체 border는 두지 않는다 */}
      <div className='mt-3 flex flex-wrap items-center gap-1'>
        <LikeButton
          activityId={activity.id}
          count={activity.likes.count}
          isLiked={activity.likes.isLiked}
        />
        <CommentSection
          activityId={activity.id}
          initialOpen={initialCommentsOpen}
        />
      </div>
    </article>
  );
};
