import { Suspense } from 'react';

import { redirect } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';

import { SignupTracker } from '@/features/onboarding';
import { getShelfPicks } from '@/features/shelf-preview/api/getShelfPicks';
import { FirstBooksPicker } from '@/features/shelf-preview/ui/FirstBooksPicker';

/**
 * 가입 직후 "읽은 책 고르기" (온보딩 두 번째 화면)
 *
 * 온보딩을 마친 사람 중 가려던 곳이 없던 사람이 온다(toPostOnboardingPath).
 * 이미 책이 있으면 고를 이유가 없으니 서재로 보낸다 — 주소로 다시 들어와도 같다.
 *
 * sign_up 은 여기서 보낸다(SignupTracker 가 ?welcome= 을 읽고 지운다).
 * 서재까지 미루면 이 화면에서 떠난 사람이 가입 수에서 빠진다.
 */
const FirstBooksPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const profile = await getProfile(user.id);
  if (!profile) redirect('/login');
  if (!profile.onboarded_at || !profile.username) redirect('/onboarding');

  const target = `/${profile.username}`;

  const supabase = await createClient();
  const { count } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  // 조회가 실패하면(count null) 고르기를 보여 준다 — 이미 있는 책은 담을 때 건너뛴다
  if (count && count > 0) redirect(target);

  const picks = await getShelfPicks();

  return (
    <PageContainer>
      <Suspense fallback={null}>
        <SignupTracker />
      </Suspense>
      <div className='mx-auto max-w-xl py-12'>
        <FirstBooksPicker picks={picks} target={target} />
      </div>
    </PageContainer>
  );
};

export default FirstBooksPage;
