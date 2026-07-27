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
  /** 이 책 스레드의 전체 댓글 수(대댓글 포함) */
  commentCount: number;
  /** 마지막 열람 이후 남이 단 댓글 수 — 0이면 배지를 감춘다 */
  newCommentCount: number;
  /** 중복 제거로 접힌 상태 변화들 — "담음 7/01 · 완독 7/20" */
  bookEvents: {
    activityType: ActivityType;
    createdAt: string;
  }[];
  /** 책 한줄평 (review_added 활동은 0건이라 books.one_line_review 를 쓴다) */
  reviewContent: string | null;
};

export type FeedParams = {
  limit?: number;
  offset?: number;
};
