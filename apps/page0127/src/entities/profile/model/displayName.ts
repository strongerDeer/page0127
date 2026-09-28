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

/**
 * 이름의 앞 글자를 잘라 아바타 이니셜을 만든다.
 *
 * ⚠️ `name[0]`·`charAt(0)`·`slice(0, 2)` 로 자르면 **안 된다.** 자바스크립트
 * 문자열은 UTF-16 코드 단위 배열이라, 이모지처럼 BMP 밖 문자는 길이가 2다.
 * 앞에서 1만 잘라내면 서로게이트 쌍의 **반쪽**(예: `'🫥'[0]` → U+D83E)이 남는데,
 * 그 단독 서로게이트는 서버가 HTML 로 내보내는 순간 U+FFFD 로 바뀐다.
 * 클라이언트는 원본을 그대로 들고 있으므로 렌더 결과가 서로 달라지고,
 * **React 가 hydration 실패를 낸다.** 2026-09-28 실제 발생(nickname 이 '🫥').
 *
 * `Array.from` 은 코드 포인트 단위로 쪼개므로 이 문제가 없다.
 * (가족 이모지처럼 ZWJ 로 이어 붙인 것은 여전히 첫 조각만 나오지만,
 *  깨진 문자가 아니라 온전한 문자라 화면도 hydration 도 멀쩡하다.)
 */
export const nameInitials = (
  name: string | null | undefined,
  count: number = 1
): string => {
  if (!name) return 'U';

  const trimmed = name.trim();
  if (!trimmed) return 'U';

  return Array.from(trimmed).slice(0, count).join('').toUpperCase();
};

/** 프로필 이미지가 없을 때 아바타에 넣을 이니셜 (한 글자) */
export const toInitial = (source: NameSource): string =>
  nameInitials(firstFilled(source.nickname, source.username));

/**
 * 공개 서재 경로. username 이 없으면 갈 곳이 없으므로 null을 돌려주고,
 * 호출부가 링크를 걸지 말지 결정한다 (깨진 링크보다 링크 없는 편이 낫다).
 *
 * JSX 안에서 링크를 그릴 때는 이 함수를 직접 쓰지 말고 entities/profile/ui/ProfileLink 를 쓴다.
 * (ProfileLink 가 내부적으로 이 함수를 호출한다 — 경로 규칙은 여기 한 곳뿐이다)
 */
export const profileHref = (username: string | null): string | null => {
  const name = firstFilled(username);
  return name ? `/${name}` : null;
};
