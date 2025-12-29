/**
 * 좋아요 엔티티 타입 정의
 *
 * 학습 포인트:
 * - 피드에서 좋아요 정보를 함께 조회하여 성능 최적화
 * - ActivityLike, LikesResponse는 향후 "좋아요한 사용자 목록" 기능에 사용 예정
 */

export type ActivityLike = {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    nickname: string | null;
    photo_url: string | null;
  } | null;
};

export type LikesResponse = {
  likes: ActivityLike[];
  count: number;
  isLiked: boolean;
};
