/**
 * Follow Entity Types
 *
 * 학습 포인트:
 * - 팔로우 관계를 나타내는 타입 정의
 * - Supabase follows 테이블과 매핑
 */

/**
 * Supabase follows 테이블 타입
 */
export type Follow = {
  id: string;
  follower_id: string; // 팔로우하는 사람
  following_id: string; // 팔로우 당하는 사람
  created_at: string;
};

/**
 * 팔로우 생성 시 사용하는 타입
 */
export type FollowInput = {
  following_id: string; // 팔로우할 사용자 ID
};

/**
 * 팔로우 통계 타입
 */
export type FollowStats = {
  followers_count: number; // 팔로워 수
  following_count: number; // 팔로잉 수
};

/**
 * 사용자 프로필 with 팔로우 정보
 * (프로필 Entity와 조인해서 사용)
 */
export type UserWithFollowInfo = {
  id: string;
  nickname: string | null;
  /**
   * 가입 시 이메일에서 자동 생성되는 고유 아이디.
   * nickname은 사용자가 직접 설정하기 전까지 null이므로 표시 이름의 대체값이 되고,
   * 공개 서재 경로(/[username])의 유일한 키이기도 하다 → 링크에는 반드시 이 값을 쓴다.
   */
  username: string | null;
  bio: string | null;
  photo_url: string | null;
  followers_count: number;
  following_count: number;
  is_following?: boolean; // 현재 로그인한 사용자가 팔로우 중인지
};
