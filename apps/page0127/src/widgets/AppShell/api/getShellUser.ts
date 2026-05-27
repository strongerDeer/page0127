import { getProfile } from '@/entities/profile/api/getProfile';

// 사이드바 셸이 필요로 하는 사용자 표시 정보 (보호/공개 레이아웃 공용)
export type ShellUser = {
  userId: string;
  photoUrl: string | null;
  displayName: string;
  username: string | null;
};

// user.id로 프로필을 조회해 셸 props를 구성한다.
// 보호 레이아웃(AppShell)과 공개 레이아웃 양쪽에서 재사용 → 매핑 중복 제거
export const getShellUser = async (userId: string): Promise<ShellUser> => {
  const profile = await getProfile(userId);

  return {
    userId,
    photoUrl: profile?.photo_url ?? null,
    displayName: profile?.nickname || profile?.email || '사용자',
    username: profile?.username ?? null,
  };
};
