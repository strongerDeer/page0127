/**
 * 활동 피드 엔티티 타입 정의
 *
 * 학습 포인트:
 * - 활동 타입별 구분 (책 추가, 완독, 리뷰)
 * - 중첩된 객체 타입 (user, book)
 */

export type ActivityType = 'book_added' | 'book_completed' | 'review_added';

export type Activity = {
  id: string;
  activity_type: ActivityType;
  content: string | null; // 리뷰 내용
  created_at: string;
  user: {
    id: string;
    nickname: string | null;
    photo_url: string | null;
  };
  book: {
    id: string;
    title: string;
    author: string;
    cover_image: string | null;
    status: string;
    rating: number | null;
  } | null;
  likes: {
    count: number;
    isLiked: boolean;
  };
};

export type FeedParams = {
  limit?: number;
  offset?: number;
};
