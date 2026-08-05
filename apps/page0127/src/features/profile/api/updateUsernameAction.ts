'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/shared/config/supabase/server';

import {
  normalizeUsername,
  validateUsername,
} from '@/entities/profile/model/username';

/**
 * 아이디(공개 서재 주소) 변경 — 평생 한 번.
 *
 * 왜 별도 액션인가:
 * 프로필 저장(updateProfileAction)과 섞으면 "닉네임만 바꾸려다 아이디까지 소진"하는
 * 사고가 난다. 되돌릴 수 없는 변경이므로 입구를 따로 둔다.
 *
 * ⚠️ 여기 검사는 사용자에게 친절한 메시지를 주기 위한 것이고,
 *    진짜 방어선은 DB 다(형식 CHECK · 예약어 CHECK · 유니크 · 1회 트리거).
 *    RLS 가 컬럼을 막지 못해 브라우저에서 직접 UPDATE 를 던질 수 있기 때문에,
 *    이 액션을 통과하지 않는 경로도 DB 가 똑같이 막아야 한다.
 */

export type UsernameActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** 성공 시 새 아이디 — 화면이 공개 서재 링크를 갱신할 때 쓴다 */
  username?: string;
};

/** DB 트리거가 올리는 예외 메시지 (마이그레이션과 동일 문자열) */
const CHANGE_LIMIT_ERROR = 'username_change_limit_exceeded';
/** Postgres 유니크 제약 위반 */
const UNIQUE_VIOLATION = '23505';
/** CHECK 제약 위반 — 화면 검사를 우회해 들어온 값 */
const CHECK_VIOLATION = '23514';

export const updateUsernameAction = async (
  _prevState: UsernameActionState,
  formData: FormData
): Promise<UsernameActionState> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  // 형식·예약어를 먼저 본다 (중복은 DB 만 안다)
  const raw = (formData.get('username') as string) ?? '';
  const check = validateUsername(raw);
  if (!check.ok) {
    return { status: 'error', message: check.message };
  }
  const nextUsername = check.value;

  // 현재 상태를 서버가 직접 읽는다 — 화면이 보낸 값을 믿지 않는다
  const { data: current, error: readError } = await supabase
    .from('profiles')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (readError || !current) {
    console.error('프로필 조회 실패:', readError?.message);
    return { status: 'error', message: '프로필을 불러올 수 없습니다.' };
  }

  if (current.username_changed_at) {
    return {
      status: 'error',
      message: '아이디는 한 번만 변경할 수 있어요.',
    };
  }

  // 같은 값이면 기회를 쓰지 않고 조용히 끝낸다 (트리거도 변경으로 보지 않는다)
  if (current.username === nextUsername) {
    return {
      status: 'success',
      message: '지금 아이디와 같아요.',
      username: nextUsername,
    };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: nextUsername, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    if (error.message.includes(CHANGE_LIMIT_ERROR)) {
      return { status: 'error', message: '아이디는 한 번만 변경할 수 있어요.' };
    }
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', message: '이미 쓰고 있는 아이디예요.' };
    }
    if (error.code === CHECK_VIOLATION) {
      return { status: 'error', message: '쓸 수 없는 아이디예요.' };
    }
    console.error('아이디 변경 실패:', error.message);
    return { status: 'error', message: '아이디 변경에 실패했습니다.' };
  }

  // 예전 주소는 이 순간부터 404 다. 공개 서재와 설정 화면을 함께 갱신한다.
  revalidatePath('/settings');
  if (current.username) revalidatePath(`/${current.username}`);
  revalidatePath(`/${nextUsername}`);

  return {
    status: 'success',
    message: '아이디를 변경했어요.',
    username: nextUsername,
  };
};

/**
 * 입력 중 중복 확인 — 저장 전에 "쓸 수 있는지"만 본다.
 *
 * 여기서 통과해도 저장 시점에 다른 사람이 먼저 가져갈 수 있다(경합).
 * 그래서 이건 편의 기능이고, 최종 판정은 언제나 저장 결과다.
 */
export type UsernameAvailability =
  | { available: true }
  | { available: false; message: string };

export const checkUsernameAvailability = async (
  raw: string
): Promise<UsernameAvailability> => {
  const check = validateUsername(raw);
  if (!check.ok) {
    return { available: false, message: check.message };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { available: false, message: '로그인이 필요합니다.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizeUsername(raw))
    .maybeSingle();

  if (error) {
    console.error('아이디 중복 확인 실패:', error.message);
    return { available: false, message: '확인에 실패했어요. 잠시 후 다시 시도해 주세요.' };
  }

  // 지금 내 아이디면 "쓸 수 있다"로 본다 (바꾸지 않는 선택지)
  if (data && data.id !== user.id) {
    return { available: false, message: '이미 쓰고 있는 아이디예요.' };
  }

  return { available: true };
};
