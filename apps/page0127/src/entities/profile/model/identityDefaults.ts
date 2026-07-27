/**
 * OAuth 공급자가 준 정보에서 프로필 초기값을 뽑는다.
 *
 * Google 로그인은 auth.users.raw_user_meta_data 에 이름과 프로필 사진을 넣어 주는데,
 * 지금까지 이 값을 아무도 읽지 않아 profiles.nickname 이 계속 null 이었고
 * 검색 결과·알림에서 신규 가입자가 전부 '익명'으로 보였다.
 *
 * user_metadata 는 공급자가 넣는 임의 JSON이라 키도 타입도 보장되지 않는다.
 * 그래서 여기서 문자열 여부까지 확인하고 걸러 낸 값만 내보낸다.
 */

export type IdentityDefaults = {
  nickname: string | null;
  photoUrl: string | null;
};

/** 문자열이면서 공백만 있지 않은 값만 통과시킨다 */
const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/**
 * 이미지 주소로 쓸 수 있는 값만 통과시킨다.
 * 외부에서 온 문자열이 그대로 <Image src>로 들어가면 안 되므로 http(s)만 허용한다.
 */
const asImageUrl = (value: unknown): string | null => {
  const text = asText(value);
  if (!text) return null;

  try {
    const { protocol } = new URL(text);
    return protocol === 'http:' || protocol === 'https:' ? text : null;
  } catch {
    return null; // URL로 파싱조차 안 되면 버린다
  }
};

/**
 * @param metadata Supabase user.user_metadata (raw_user_meta_data)
 * @returns 프로필 생성 시 채워 넣을 초기값 (없으면 null)
 */
export const toIdentityDefaults = (
  metadata: Record<string, unknown> | null | undefined
): IdentityDefaults => {
  if (!metadata) return { nickname: null, photoUrl: null };

  return {
    // 공급자마다 키가 다르다 — Google은 full_name·name을 둘 다 주지만 보장은 없다
    nickname: asText(metadata.full_name) ?? asText(metadata.name),
    photoUrl: asImageUrl(metadata.avatar_url) ?? asImageUrl(metadata.picture),
  };
};
