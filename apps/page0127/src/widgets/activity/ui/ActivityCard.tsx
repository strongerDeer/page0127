import Image from 'next/image';
import Link from 'next/link';

import { Star } from 'lucide-react';

import { BookCover } from '@/shared/ui/BookCover';
import { RelativeTime } from '@/shared/ui/RelativeTime';

import { Activity } from '@/entities/activity';
import { isRated } from '@/entities/book';
import { ProfileLink } from '@/entities/profile/ui/ProfileLink';

import { CommentSection } from '@/features/comment';
import { BookRecordLikeButton } from '@/features/like';

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
  hideBook?: boolean; // 책 상세에선 책 표지 첨부를 숨긴다(중복 방지)
};

const EVENT_LABEL: Record<Activity['activity_type'], string> = {
  book_added: '담음',
  book_completed: '완독',
  review_added: '리뷰',
};

/** "담음 7/01 · 완독 7/20" — 중복 제거로 접힌 활동들을 한 줄로 되살린다 */
const formatBookEvents = (events: Activity['bookEvents']) =>
  events
    .map((e) => {
      const d = new Date(e.createdAt);
      return `${EVENT_LABEL[e.activityType]} ${d.getMonth() + 1}/${d.getDate()}`;
    })
    .join(' · ');

type BookAttachmentLinkProps = {
  username: string | null;
  bookId: string;
  children: React.ReactNode;
};

/**
 * 책 첨부를 상세로 가는 링크로 감싼다.
 *
 * 학습 포인트: username 이 없으면 링크 없이 그대로 그린다. 없는 값으로 경로를 만들면
 * 404로 보내게 되므로, "누를 수 있지만 깨진 링크"보다 "누를 수 없는 카드"가 낫다.
 */
const BookAttachmentLink = ({
  username,
  bookId,
  children,
}: BookAttachmentLinkProps) => {
  const className =
    'mt-4 flex items-center gap-4 rounded-xl border border-line-soft bg-card p-4';

  if (!username) return <div className={className}>{children}</div>;

  return (
    <Link
      href={`/${username}/${bookId}`}
      className={`${className} transition-colors hover:bg-sunken`}
    >
      {children}
    </Link>
  );
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
  hideBook = false,
}: ActivityCardProps) => {
  if (!activity.book) return null;

  return (
    // 테두리 카드가 아니라 구분선 리스트의 한 항목 — 부모(ActivityFeed)가 divide-y를 건다
    <article className='py-7'>
      {/* 헤더 — 누가 · 무엇을 · 언제, 한 줄 */}
      <div className='flex items-center gap-3'>
        <ProfileLink username={activity.user.username} className='shrink-0'>
          {activity.user.photo_url ? (
            <div className='relative size-11 overflow-hidden rounded-full'>
              <Image
                src={activity.user.photo_url}
                alt=''
                fill
                sizes='44px'
                className='object-cover'
              />
            </div>
          ) : (
            <div className='flex size-11 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground'>
              {(activity.user.nickname || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </ProfileLink>

        <p className='min-w-0 flex-1 truncate text-base'>
          <ProfileLink
            username={activity.user.username}
            className='font-medium text-text-strong hover:underline'
          >
            {activity.user.nickname || '익명'}
          </ProfileLink>
          <span className='ml-1.5 text-text-subtle'>
            {getActivityText(activity.activity_type)}
          </span>
        </p>

        <RelativeTime
          date={activity.created_at}
          className='shrink-0 text-sm text-text-subtle'
        />
      </div>

      {/* 책 첨부 — 작은 표지 + 제목·저자·별점.
          책 상세는 /{username}/{bookId} 하나뿐이다(/books/[id]는 옛 경로 리다이렉트).
          username 이 없으면(이론상) 링크를 걸지 않고 그대로 둔다 — 깨진 경로보다 낫다 */}
      {!hideBook && (
        <BookAttachmentLink
          username={activity.user.username}
          bookId={activity.book.id}
        >
          <BookCover
            src={activity.book.cover_image}
            title={activity.book.title}
            width={64}
            height={96}
            decorative
            className='h-24 w-16 shrink-0'
          />

          <div className='min-w-0 flex-1'>
            <p className='truncate text-base font-medium text-text-strong'>
              {activity.book.title}
            </p>
            <p className='mt-1 truncate text-sm text-text-subtle'>
              {activity.book.author}
            </p>
          </div>

          {/* 평점 (완독 시) — 첨부 우측에 정렬.
              isRated: 0("평가 안 함")을 걸러낸다. `rating &&` 로 두면 0이 falsy가 아니라
              숫자 0으로 렌더돼 화면에 "0"만 남는다.
              인생책은 점수가 아니라 이름으로 보여준다 */}
          {activity.activity_type === 'book_completed' &&
            isRated(activity.book.rating) && (
              <p className='flex shrink-0 items-center gap-1.5 text-sm font-medium text-text-body'>
                <Star
                  aria-hidden='true'
                  className='size-3.5 fill-rank-up text-rank-up'
                />
                {activity.book.is_life_book ? '인생책' : activity.book.rating}
              </p>
            )}
        </BookAttachmentLink>
      )}

      {/* 리뷰 내용 — 유저가 쓴 글은 다듬지 않고 그대로 보여준다 */}
      {activity.activity_type === 'review_added' && activity.content && (
        <p className='mt-4 line-clamp-3 break-keep text-base leading-7 text-text-body'>
          {activity.content}
        </p>
      )}

      {/* 접힌 상태 변화 요약 — 이 카드는 책 1장이므로 개별 활동은 여기로 압축된다.
          활동이 하나뿐이면 헤더에 이미 적혀 있어 중복이라 감춘다 */}
      {activity.bookEvents.length > 1 && (
        <p className='mt-3 text-sm text-text-subtle'>
          {formatBookEvents(activity.bookEvents)}
        </p>
      )}

      {/* 한줄평 — 최신 활동이 완독이어도 리뷰 본문이 보이게 한다 */}
      {activity.reviewContent && (
        <p className='mt-2 line-clamp-3 break-keep text-base leading-7 text-text-body'>
          {activity.reviewContent}
        </p>
      )}

      {/* 액션 바 — 좋아요·댓글 한 줄. 댓글 패널은 w-full로 줄바꿈해 전체 폭 사용.
          리스트 구분선과 겹치므로 자체 border는 두지 않는다 */}
      <div className='mt-3 flex flex-wrap items-center gap-1'>
        <BookRecordLikeButton
          bookId={activity.book.id}
          count={activity.likes.count}
          isLiked={activity.likes.isLiked}
        />
        <CommentSection
          target={{ type: 'book', id: activity.book.id }}
          initialOpen={initialCommentsOpen}
        />
        {/* 마지막으로 이 스레드를 본 뒤 남이 단 댓글 — 열면 사라진다 */}
        {activity.newCommentCount > 0 && (
          <span className='rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'>
            새 댓글 {activity.newCommentCount}
          </span>
        )}
      </div>
    </article>
  );
};
