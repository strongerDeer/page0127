import { isDemoUser } from '@/shared/lib/demo/demoAccount';

import { getProfile } from '@/entities/profile/api/getProfile';

import type { AuthUser } from '@/shared/lib/auth/getVerifiedUser';

// 사이드바 셸이 필요로 하는 사용자 표시 정보 (보호/공개 레이아웃 공용)
export type ShellUser = {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  username: string | null;
  /**
   * 온보딩(아이디 정하기)을 마쳤는가. username 으로는 알 수 없다 —
   * 가입할 때 자동 생성되어 온보딩 전에도 값이 있다.
   */
  onboarded: boolean;
  /** 리뷰어용 체험 계정인가 — 셸이 "체험 중" 띠를 보여 준다 */
  isDemo: boolean;
};

// user.id로 프로필을 조회해 셸 props를 구성한다.
// 보호 레이아웃(AppShell)과 공개 레이아웃 양쪽에서 재사용 → 매핑 중복 제거
// 체험 계정 여부는 JWT 의 app_metadata 로 안다(프로필을 한 번 더 읽지 않는다)
export const getShellUser = async (
  user: Pick<AuthUser, 'id' | 'app_metadata'>
): Promise<ShellUser> => {
  const profile = await getProfile(user.id);

  return {
    userId: user.id,
    photoUrl: profile?.photo_url ?? null,
    // profiles.email 은 읽을 수 없다(profileColumns.ts). 닉네임이 없으면 아이디로 대신한다
    displayName: profile?.nickname || profile?.username || '사용자',
    username: profile?.username ?? null,
    onboarded: Boolean(profile?.onboarded_at),
    isDemo: isDemoUser(user),
  };
};
