import { createClient } from '@/shared/config/supabase/server';

import { toIdentityDefaults } from '../model/identityDefaults';
import { generateUsernameFromEmail, USERNAME_MAX_LENGTH } from '../model/username';

import type { Profile } from '../types';

/** Postgres 유니크 제약 위반. 같은 username 을 동시에 고른 가입자를 구분한다 */
const UNIQUE_VIOLATION = '23505';

/**
 * 사용자 프로필 조회 (Server Component용)
 *
 * 학습 포인트:
 * - Server Component에서 직접 Supabase 호출
 * - profiles 테이블이 없으면 자동 생성
 * - reading_goal은 JSONB 타입
 *
 * @param userId - 사용자 ID
 * @returns 프로필 정보
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();

  // 1. 프로필 조회
  // 학습 포인트: maybeSingle()은 0개 또는 1개의 결과를 허용 (탈퇴한 사용자 대응)
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // 프로필이 없으면 null 반환 (에러 로그만 출력)
    console.error('프로필 조회 실패:', error.message);
    return null;
  }

  return profile;
};

/** 접미사를 붙여도 20자를 넘지 않도록 앞부분을 자른다 */
const withSuffix = (base: string, suffix: string): string =>
  `${base.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;

/** 겹쳤을 때 쓸 무작위 접미사 — 소문자·숫자만이라 형식 규칙을 깨지 않는다 */
const randomSuffix = (): string => Math.random().toString(36).slice(2, 8);

/**
 * 겹치지 않는 username 을 만든다.
 *
 * 기존 구현은 후보 하나마다 쿼리를 던져 **최대 101회 왕복**했다.
 * 여기서는 후보를 한 번에 만들고 한 번의 `in` 조회로 걸러 낸다.
 *
 * ⚠️ 확인과 저장 사이의 경합은 여기서 막을 수 없다(같은 순간 같은 이름을 고른
 *    두 가입자). 최종 방어선은 DB 의 유니크 제약이고, 저장에 실패하면
 *    upsertProfile 이 무작위 이름으로 다시 시도한다.
 *
 * @param email - 사용자 이메일
 * @returns 형식 규칙을 통과하고, 조회 시점에 비어 있던 username
 */
export const generateUniqueUsername = async (
  email: string
): Promise<string> => {
  const supabase = await createClient();
  const base = generateUsernameFromEmail(email);

  // base, base1 … base20 을 후보로 둔다
  const candidates = [
    base,
    ...Array.from({ length: 20 }, (_, i) => withSuffix(base, String(i + 1))),
  ];

  const { data } = await supabase
    .from('profiles')
    .select('username')
    .in('username', candidates);

  const taken = new Set((data ?? []).map((row) => row.username));
  const free = candidates.find((candidate) => !taken.has(candidate));

  // 21개가 전부 찼으면 무작위로 간다 (base 가 흔한 이름일 때)
  return free ?? withSuffix(base, randomSuffix());
};

/**
 * 프로필 생성 또는 업데이트 (upsert)
 *
 * 학습 포인트:
 * - 처음 로그인한 사용자는 프로필이 없을 수 있음
 * - upsert로 자동 생성/업데이트
 * - username이 없으면 자동 생성
 *
 * @param userId - 사용자 ID
 * @param email - 사용자 이메일
 * @param metadata - OAuth 공급자가 준 user_metadata (신규 생성 시 이름·사진 초기값)
 */
export const upsertProfile = async (
  userId: string,
  email: string,
  metadata?: Record<string, unknown> | null
): Promise<void> => {
  const supabase = await createClient();

  // 1. 기존 프로필 확인
  const existingProfile = await getProfile(userId);

  // 2. username이 없으면 생성
  let username: string | undefined;
  if (!existingProfile?.username) {
    username = await generateUniqueUsername(email);
  }

  // 3. 이름·사진 초기값은 "처음 만들 때"만 넣는다.
  //    이미 있는 프로필에 덮으면 사용자가 지운 프로필 사진이 로그인할 때마다 되살아난다.
  const defaults = existingProfile
    ? { nickname: null, photoUrl: null }
    : toIdentityDefaults(metadata);

  // 4. upsert (값이 있는 항목만 추가, 없으면 기존 유지)
  //
  // username 은 경합에 질 수 있다 — 같은 순간 같은 이름을 고른 다른 가입자가
  // 먼저 저장하면 유니크 제약(23505)에 걸린다. 그때는 무작위 이름으로 한 번 더
  // 시도한다. 예전에는 에러를 통째로 무시해서, 실패하면 프로필 없이 조용히
  // 넘어갔다가 ensureProfile 이 "프로필 생성에 실패했습니다"로 죽었다.
  const save = (name: string | undefined) =>
    supabase.from('profiles').upsert(
      {
        id: userId,
        email,
        ...(name && { username: name }), // username이 있을 때만 추가
        ...(defaults.nickname && { nickname: defaults.nickname }),
        ...(defaults.photoUrl && { photo_url: defaults.photoUrl }),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    );

  const { error } = await save(username);
  if (!error) return;

  // username 을 만들지 않은 호출(이미 있는 프로필)이면 재시도해도 결과가 같다
  if (error.code !== UNIQUE_VIOLATION || !username) {
    console.error('프로필 저장 실패:', error.message);
    return;
  }

  const { error: retryError } = await save(
    withSuffix(generateUsernameFromEmail(email), randomSuffix())
  );
  if (retryError) {
    console.error('프로필 저장 재시도 실패:', retryError.message);
  }
};

/**
 * 프로필이 없으면 생성하고, username까지 보장해서 반환한다.
 *
 * 로그인 콜백 등 "프로필이 확실히 있어야 다음 단계로 갈 수 있는" 지점에서 쓴다.
 * (dashboard/page.tsx에 있던 로직을 재사용 가능한 형태로 옮겼다)
 *
 * @param metadata - OAuth 공급자가 준 user_metadata. 첫 생성 시 닉네임·사진의 초기값이 된다.
 */
export const ensureProfile = async (
  userId: string,
  email: string,
  metadata?: Record<string, unknown> | null
): Promise<Profile> => {
  let profile = await getProfile(userId);

  if (!profile) {
    await upsertProfile(userId, email, metadata);
    profile = await getProfile(userId);
  }

  if (!profile) {
    throw new Error('프로필 생성에 실패했습니다.');
  }

  return profile;
};
