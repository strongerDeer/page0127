'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';

import { validateUsername } from '@/entities/profile/model/username';

/**
 * 첫 로그인 온보딩 완료 — 아이디와 닉네임을 확정한다.
 *
 * 왜 service_role 인가:
 * 가입할 때 아이디는 이메일·닉네임에서 자동으로 만들어진다. 온보딩에서 그걸
 * 고치는 것은 사용자가 쓰는 "평생 한 번"의 변경 기회가 아니라 **최초 설정**이다.
 * 일반 경로로 UPDATE 하면 트리거가 username_changed_at 을 찍어 기회를 소진한다.
 * service_role 은 트리거가 통째로 통과시키므로 그 일이 일어나지 않는다.
 *
 * ⚠️ service_role 은 RLS 를 우회한다. 그래서 **누구의 요청인지는 반드시 세션으로**
 *    확인하고(아래 getUser), 그 사용자 자신의 행만 건드린다.
 *    formData 로 넘어온 id 같은 건 절대 믿지 않는다.
 *
 * ⚠️ 이미 온보딩을 마친 사람은 여기로 못 들어온다. 안 막으면 이 경로로
 *    아이디를 무한히 바꿀 수 있다(변경 기회를 소진하지 않으므로).
 */

/**
 * 성공하면 값을 돌려주지 않는다 — 서버에서 바로 서재로 보내기 때문이다.
 * 그래서 화면이 볼 상태는 '아직 안 냈다'와 '실패했다' 둘뿐이다.
 */
export type OnboardingActionState = {
  status: 'idle' | 'error';
  message: string;
};

/** Postgres 유니크 제약 위반 — 같은 순간 같은 아이디를 고른 사람이 있었다 */
const UNIQUE_VIOLATION = '23505';
/** CHECK 제약 위반 — 화면 검사를 우회해 들어온 값 */
const CHECK_VIOLATION = '23514';

/** 닉네임은 표시용이라 길이만 본다 (프로필 설정과 같은 한도) */
const NICKNAME_MAX_LENGTH = 20;

export const completeOnboardingAction = async (
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  const check = validateUsername((formData.get('username') as string) ?? '');
  if (!check.ok) {
    return { status: 'error', message: check.message };
  }
  const username = check.value;

  const nickname = ((formData.get('nickname') as string) ?? '').trim();
  if (nickname.length === 0) {
    return { status: 'error', message: '닉네임을 입력해 주세요.' };
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      status: 'error',
      message: `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하여야 해요.`,
    };
  }

  // 현재 상태는 서버가 직접 읽는다 — 화면이 보낸 값을 믿지 않는다
  const { data: current, error: readError } = await supabase
    .from('profiles')
    .select('username, onboarded_at')
    .eq('id', user.id)
    .maybeSingle();

  if (readError || !current) {
    console.error('프로필 조회 실패:', readError?.message);
    return { status: 'error', message: '프로필을 불러올 수 없습니다.' };
  }

  // 이미 마친 사람은 설정 화면의 '아이디 변경'을 쓰게 한다.
  // 여기를 열어 두면 변경 횟수 제한이 무의미해진다.
  if (current.onboarded_at) {
    return {
      status: 'error',
      message: '이미 완료한 단계예요. 아이디는 설정에서 바꿀 수 있어요.',
    };
  }

  // 여기부터 service_role — 위에서 확인한 user.id 의 행만 건드린다
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      username,
      nickname,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', message: '이미 쓰고 있는 아이디예요.' };
    }
    if (error.code === CHECK_VIOLATION) {
      return { status: 'error', message: '쓸 수 없는 아이디예요.' };
    }
    console.error('온보딩 완료 실패:', error.message);
    return { status: 'error', message: '저장에 실패했습니다.' };
  }

  // 자동 생성됐던 주소는 이 순간부터 404 다. 양쪽을 함께 갱신한다.
  if (current.username && current.username !== username) {
    revalidatePath(`/${current.username}`);
  }
  revalidatePath(`/${username}`);
  revalidatePath('/settings');

  // 이동은 서버에서 한다. 처음엔 화면에서 router.replace 로 옮겼는데
  // 실제로 이동하지 않았다(액션 완료와 재렌더가 겹치는 자리다).
  // 여기서 redirect 하면 그 경합이 없고, 다른 가드들과 방식도 같아진다.
  //
  // ⚠️ redirect 는 예외를 던져 흐름을 끊는다 — try/catch 로 감싸면 안 된다.
  //    그래서 실패 경로(위)를 모두 처리한 뒤 맨 마지막에 부른다.
  redirect(`/${username}`);
};
