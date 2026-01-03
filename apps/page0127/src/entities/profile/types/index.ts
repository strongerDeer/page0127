/**
 * 사용자 프로필 타입 정의
 *
 * 학습 포인트:
 * - Supabase profiles 테이블과 매핑
 * - reading_goal은 JSONB 타입으로 저장
 */

/**
 * 연간 독서 목표
 */
export type ReadingGoal = {
  /** 목표 연도 */
  year: number;

  /** 목표 권수 */
  target: number;
};

/**
 * 사용자 프로필
 */
export type Profile = {
  /** 사용자 ID (auth.users.id와 동일) */
  id: string;

  /** 이메일 */
  email: string | null;

  /** 사용자 고유 ID (공개 서재 URL용, 예: abc, abc1, abc2) */
  username: string | null;

  /** 닉네임 */
  nickname: string | null;

  /** 한줄 소개 */
  bio: string | null;

  /** 프로필 이미지 URL */
  photo_url: string | null;

  /** 연간 독서 목표 */
  reading_goal: ReadingGoal | null;

  /** 생성일 */
  created_at: string;

  /** 수정일 */
  updated_at: string;
};

/**
 * 프로필 업데이트 DTO
 */
export type UpdateProfileDto = {
  username?: string;
  nickname?: string;
  bio?: string;
  photo_url?: string | null;
  reading_goal?: ReadingGoal;
};
