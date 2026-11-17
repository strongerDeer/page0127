import { Star } from 'lucide-react';

import { isRated, RATING_MAX } from '@/entities/book';

import type { RecapBook } from '@/entities/recap';

/**
 * 별점 — 채워진 별과 빈 별. 인생책이면 점수 대신 이름을 곁들인다.
 *
 * 트랙 F가 평점을 정리한 뒤로 rating 은 0~5 뿐이고, 옛 10점(인생책)은
 * `is_life_book` 컬럼으로 빠졌다. 그래서 접는 변환 없이 값을 그대로 쓴다.
 * 0("평가 안 함")은 `isRated` 가 걸러낸다.
 *
 * 인생책을 점수가 아니라 이름으로 보여주는 것은 BookCardInfo·BookSavedCard 와
 * 같은 관례다.
 */
export const RecapRating = ({
  rating,
  isLifeBook,
}: {
  rating: RecapBook['rating'];
  isLifeBook: boolean;
}) => {
  if (!isRated(rating) && !isLifeBook) return null;

  return (
    <p className='mt-1 flex items-center gap-2 text-sm text-text-subtle'>
      {isRated(rating) && (
        <>
          {/* 글자 ★☆ 대신 아이콘 — 글꼴에 따라 이모지처럼 그려지지 않게. 채움 = 점수, 테두리만 = 남은 칸 */}
          <span aria-hidden='true' className='flex items-center gap-0.5'>
            {Array.from({ length: RATING_MAX }, (_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${i < rating ? 'fill-current' : ''}`}
              />
            ))}
          </span>
          <span className='sr-only'>{`${RATING_MAX}점 만점에 ${rating}점`}</span>
        </>
      )}

      {isLifeBook && (
        <span className='rounded-full bg-chart-3/15 px-2 py-0.5 font-medium text-primary'>
          인생책
        </span>
      )}
    </p>
  );
};
