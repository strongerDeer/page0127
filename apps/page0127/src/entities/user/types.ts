/**
 * 사용자 엔티티 타입 정의
 *
 * 학습 포인트:
 * - 사용자 검색 결과 타입
 * - 팔로우 정보를 포함한 사용자 프로필
 */

export type UserSearchResult = {
  id: string;
  nickname: string | null;
  username: string | null;
  bio: string | null;
  photo_url: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
};
