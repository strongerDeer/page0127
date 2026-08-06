import { createClient } from '@/shared/config/supabase/server';

import { toIdentityDefaults } from '../model/identityDefaults';
import { generateUsernameSeed, USERNAME_MAX_LENGTH } from '../model/username';

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
 * @param source - 아이디를 뽑을 재료. 이메일이 없을 수 있어(카카오) 닉네임도 받는다
 * @returns 형식 규칙을 통과하고, 조회 시점에 비어 있던 username
 */
export const generateUniqueUsername = async (source: {
  email?: string | null;
  nickname?: string | null;
}): Promise<string> => {
  const supabase = await createClient();
  const base = generateUsernameSeed(source);

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
 * @param email - 사용자 이메일. **없을 수 있다** — 카카오는 이메일 동의가 선택이다
 * @param metadata - OAuth 공급자가 준 user_metadata (신규 생성 시 이름·사진 초기값)
 */
/**
 * 저장 결과. 실패 사유를 호출자에게 넘긴다.
 *
 * 예전에는 `void` 를 반환하고 실패를 `console.error` 로만 남겼다. 그래서
 * `ensureProfile` 은 프로필이 왜 없는지 알 수 없었고, 사용자에게는 원인 없는
 * "프로필 생성에 실패했습니다" 만 보였다 — Sentry 에도 증상만 쌓였다.
 */
export type UpsertProfileResult =
  | { ok: true; savedRows: number }
  | { ok: false; reason: string };

export const upsertProfile = async (
  userId: string,
  email: string | null,
  metadata?: Record<string, unknown> | null
): Promise<UpsertProfileResult> => {
  const supabase = await createClient();

  // 1. 기존 프로필 확인
  const existingProfile = await getProfile(userId);

  // 2. 공급자가 준 이름·사진. 이메일이 없을 때 아이디의 재료로도 쓰인다.
  const identity = toIdentityDefaults(metadata);

  // 3. username이 없으면 생성
  let username: string | undefined;
  if (!existingProfile?.username) {
    username = await generateUniqueUsername({
      email,
      nickname: identity.nickname,
    });
  }

  // 4. 이름·사진 초기값은 "처음 만들 때"만 넣는다.
  //    이미 있는 프로필에 덮으면 사용자가 지운 프로필 사진이 로그인할 때마다 되살아난다.
  const defaults = existingProfile
    ? { nickname: null, photoUrl: null }
    : identity;

  // 5. upsert (값이 있는 항목만 추가, 없으면 기존 유지)
  //
  // username 은 경합에 질 수 있다 — 같은 순간 같은 이름을 고른 다른 가입자가
  // 먼저 저장하면 유니크 제약(23505)에 걸린다. 그때는 무작위 이름으로 한 번 더
  // 시도한다. 예전에는 에러를 통째로 무시해서, 실패하면 프로필 없이 조용히
  // 넘어갔다가 ensureProfile 이 "프로필 생성에 실패했습니다"로 죽었다.
  /*
    `.select('id')` 를 붙이는 이유: **몇 행이 저장됐는지** 알기 위해서다.

    붙이지 않으면 PostgREST 는 저장된 행을 돌려주지 않는다. 그러면 RLS 정책에
    막혀 0행이 처리된 경우와 정상 저장이 구분되지 않는다 — 둘 다 `error` 가
    비어 있어 "성공" 으로 보인다. 실제로 프로필 없이 넘어간 사고가 있었다.
  */
  const save = (name: string | undefined) =>
    supabase
      .from('profiles')
      .upsert(
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
      )
      .select('id');

  const { data, error } = await save(username);
  if (!error) return { ok: true, savedRows: data?.length ?? 0 };

  // username 을 만들지 않은 호출(이미 있는 프로필)이면 재시도해도 결과가 같다
  if (error.code !== UNIQUE_VIOLATION || !username) {
    console.error('프로필 저장 실패:', error.message);
    return { ok: false, reason: `저장 실패(${error.code}): ${error.message}` };
  }

  const { data: retryData, error: retryError } = await save(
    withSuffix(
      generateUsernameSeed({ email, nickname: identity.nickname }),
      randomSuffix()
    )
  );
  if (retryError) {
    console.error('프로필 저장 재시도 실패:', retryError.message);
    return {
      ok: false,
      reason: `아이디 중복 후 재시도도 실패(${retryError.code}): ${retryError.message}`,
    };
  }

  return { ok: true, savedRows: retryData?.length ?? 0 };
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
  email: string | null,
  metadata?: Record<string, unknown> | null
): Promise<Profile> => {
  let profile = await getProfile(userId);
  if (profile) return profile;

  const saved = await upsertProfile(userId, email, metadata);
  profile = await getProfile(userId);
  if (profile) return profile;

  /*
    여기까지 왔다는 건 저장과 조회 사이에서 무언가 어긋났다는 뜻이다.
    예전 메시지는 "프로필 생성에 실패했습니다." 한 줄이라 **원인을 하나도
    말하지 않았다** — 가입 직후 첫 화면에서 나는 500 인데 Sentry 에도
    증상만 쌓였다. 세 갈래를 구분해 남긴다.
  */
  if (!saved.ok) {
    throw new Error(`프로필 생성 실패 — ${saved.reason}`);
  }

  if (saved.savedRows === 0) {
    // upsert 가 에러 없이 0행을 처리한 경우. RLS 정책에 막히면 이렇게 된다.
    throw new Error(
      '프로필 생성 실패 — 저장 요청은 통과했지만 0행이 반영됐습니다 (profiles RLS 정책 확인 필요)'
    );
  }

  throw new Error(
    `프로필 생성 실패 — ${saved.savedRows}행을 저장했는데 곧바로 조회되지 않았습니다 (조회 권한 또는 반영 지연 확인 필요)`
  );
};
