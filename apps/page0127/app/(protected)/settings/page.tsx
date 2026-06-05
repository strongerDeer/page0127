import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { PageContainer } from '@/shared/ui/PageContainer';

import { getProfile } from '@/entities/profile/api/getProfile';

import { ProfileSettingsForm } from '@/features/profile/ui/ProfileSettingsForm';

/**
 * 프로필 설정 페이지
 *
 * 학습 포인트:
 * - Server Component: 초기 데이터 페칭
 * - 사용자 인증 체크
 * - 프로필 정보 불러오기
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  // 1. 사용자 인증 체크
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. 프로필 정보 불러오기
  const profile = await getProfile(user.id);

  if (!profile) {
    return (
      <PageContainer width='narrow'>
        <p className='text-center text-muted-foreground'>
          프로필 정보를 불러올 수 없습니다.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer width='narrow'>
      <ProfileSettingsForm profile={profile} />
    </PageContainer>
  );
}
