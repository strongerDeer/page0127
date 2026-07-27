import { Star } from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

import { isLifeBook, isRated } from '@/entities/book';

type BookStreamEventProps = {
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
  rating?: number | null;
};

const EVENT_TEXT: Record<BookStreamEventProps['activityType'], string> = {
  book_added: '책장에 담았어요',
  book_completed: '완독했어요',
  review_added: '리뷰를 남겼어요',
};

/**
 * 스트림 중간에 놓이는 상태 변화 한 줄
 *
 * 학습 포인트:
 * - 댓글과 시각적으로 구분되어야 하되 카드가 되어선 안 된다. 대화의 흐름을 끊지 않도록
 *   점 + 옅은 글씨의 얇은 줄로 둔다.
 */
export const BookStreamEvent = ({
  activityType,
  content,
  createdAt,
  rating,
}: BookStreamEventProps) => (
  <div className='py-2'>
    <p className='flex items-center gap-2 text-sm text-text-subtle'>
      <span aria-hidden='true' className='size-1.5 rounded-full bg-line' />
      <RelativeTime date={createdAt} className='text-text-faint' />
      <span>{EVENT_TEXT[activityType]}</span>
      {/* 0("평가 안 함")은 별 배지를 걸지 않고, 10은 점수가 아니라 '인생책'이다
          (책 상세 본문의 평점 배지와 같은 규칙) */}
      {activityType === 'book_completed' && isRated(rating ?? null) ? (
        <span className='flex items-center gap-1 text-text-body'>
          <Star
            aria-hidden='true'
            className='size-3.5 fill-chart-4 text-chart-4'
          />
          {isLifeBook(rating ?? null) ? '인생책' : rating}
        </span>
      ) : null}
    </p>

    {activityType === 'review_added' && content && (
      <p className='mt-1 pl-4 text-[15px] leading-7 text-text-body'>
        {content}
      </p>
    )}
  </div>
);
