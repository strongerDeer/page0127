import { redirect } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

import { OnboardingForm } from '@/features/onboarding/ui/OnboardingForm';

/**
 * 첫 로그인 온보딩
 *
 * 콜백이 onboarded_at 이 NULL 인 사용자를 여기로 보낸다.
 * 이미 마친 사람이 주소로 직접 들어오면 서재로 되돌린다 —
 * 안 그러면 온보딩을 다시 타서 아이디를 또 정할 수 있다.
 * (서버 액션도 같은 검사를 한다. 여기 검사는 화면을 안 보여 주기 위한 것이다)
 */
const OnboardingPage = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getProfile(user.id);
  if (!profile) redirect('/login');

  if (profile.onboarded_at) {
    redirect(`/${profile.username}`);
  }

  return (
    <PageContainer width='narrow'>
      <div className='mx-auto max-w-md py-12'>
        <h1 className='heading-1 mb-2'>거의 다 왔어요</h1>
        <p className='mb-8 text-text-subtle'>
          공개 서재 주소로 쓸 아이디와, 서재에서 보일 이름을 정해 주세요.
        </p>

        <OnboardingForm
          // 가입할 때 자동으로 만들어진 값들. 그대로 두고 넘어가도 된다.
          initialUsername={profile.username ?? ''}
          initialNickname={profile.nickname ?? ''}
        />
      </div>
    </PageContainer>
  );
};

export default OnboardingPage;
