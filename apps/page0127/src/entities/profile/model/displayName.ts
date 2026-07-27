/**
 * "이 사용자를 화면에 뭐라고 부를 것인가"를 한 곳에 모은다.
 *
 * profiles.nickname 은 사용자가 프로필 설정에서 직접 입력하기 전까지 null이다.
 * 반면 username 은 가입 시 이메일에서 자동 생성되므로 항상 있다.
 * 그래서 nickname 만 보고 '익명'으로 떨어뜨리면, 아무 잘못도 없는 신규 가입자가
 * 검색 결과·알림에서 전부 '익명'으로 보인다.
 *
 * 링크도 같은 이유로 여기 둔다. 공개 서재 경로는 /[username] 이고
 * getProfileByUsername 이 username 컬럼으로만 조회하므로,
 * nickname 이나 id 로 만든 링크는 전부 404 가 된다.
 */

/** 표시 이름 계산에 필요한 최소 필드 */
export type NameSource = {
  nickname: string | null;
  username: string | null;
};

/** 이름을 하나도 못 찾았을 때의 마지막 표기 */
const ANONYMOUS = '익명';

/** 공백만 든 값은 이름이 없는 것으로 본다 */
const firstFilled = (
  ...candidates: (string | null | undefined)[]
): string | null =>
  candidates.find((value) => value && value.trim().length > 0)?.trim() ?? null;

/** 화면에 보여줄 이름 — nickname → username → '익명' 순으로 떨어진다 */
export const toDisplayName = (source: NameSource): string =>
  firstFilled(source.nickname, source.username) ?? ANONYMOUS;

/** 프로필 이미지가 없을 때 아바타에 넣을 이니셜 (한 글자) */
export const toInitial = (source: NameSource): string => {
  const name = firstFilled(source.nickname, source.username);
  return name ? name.charAt(0).toUpperCase() : 'U';
};

/**
 * 공개 서재 경로. username 이 없으면 갈 곳이 없으므로 null을 돌려주고,
 * 호출부가 링크를 걸지 말지 결정한다 (깨진 링크보다 링크 없는 편이 낫다).
 */
export const profileHref = (source: {
  id: string;
  username: string | null;
}): string | null => {
  const username = firstFilled(source.username);
  return username ? `/${username}` : null;
};
