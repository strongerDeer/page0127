/**
 * 아이디(username) 규칙 — 화면과 서버가 같은 판단을 하도록 한 곳에 모은다.
 *
 * ⚠️ 이 파일은 DB 제약의 **거울**이다. 진짜 계약은
 *    `supabase/migrations/20260805000000_username_change_policy.sql` 에 있고,
 *    여기 규칙은 "저장하기 전에 친절하게 알려 주기" 위한 것이다.
 *    한쪽만 고치면 사용자는 통과했다고 생각한 값에서 DB 에러를 본다.
 *    → 규칙을 바꾸려면 **반드시 마이그레이션과 함께** 바꾼다.
 */

/** 아이디 최소 길이 (DB CHECK 과 동일) */
export const USERNAME_MIN_LENGTH = 3;
/** 아이디 최대 길이 (DB CHECK 과 동일) */
export const USERNAME_MAX_LENGTH = 20;

/** 허용 문자: 영소문자·숫자·언더스코어. 대문자를 막아 /Hong 과 /hong 혼란을 없앤다 */
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * 공개 서재 주소로 쓸 수 없는 값.
 *
 * Next.js 는 정적 경로를 동적 경로보다 먼저 매칭하므로, username 이 'about' 인
 * 사용자가 생기면 그 사람의 서재는 영원히 열리지 않는다.
 * `is_reserved_username()` (마이그레이션)과 같은 목록을 유지한다.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // 실제 라우트 (app/ 최상위 세그먼트)
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'settings',
  'books',
  'dashboard',
  'feed',
  'notifications',
  'search',
  'about',
  'contact',
  'privacy',
  'terms',
  // Next.js 파일 규칙이 만드는 최상위 경로
  'sitemap',
  'sitemap.xml',
  'robots',
  'robots.txt',
  'opengraph-image',
  'icon',
  'favicon',
  'favicon.ico',
  '_next',
  'static',
  'public',
  'well-known',
  // 아직 없지만 만들면 충돌하는 것들
  'help',
  'support',
  'blog',
  'pricing',
  'signup',
  'register',
  'me',
  'new',
  'edit',
  'delete',
  'account',
  'profile',
  'user',
  'users',
  'null',
  'undefined',
  'page0127',
]);

/** 검증 실패 사유 — UI 가 문구를 고르고, 테스트가 이 값으로 단언한다 */
export type UsernameIssue =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'reserved';

export type UsernameCheck =
  | { ok: true; value: string }
  | { ok: false; issue: UsernameIssue; message: string };

const MESSAGES: Record<UsernameIssue, string> = {
  empty: '아이디를 입력해 주세요.',
  too_short: `아이디는 ${USERNAME_MIN_LENGTH}자 이상이어야 해요.`,
  too_long: `아이디는 ${USERNAME_MAX_LENGTH}자 이하여야 해요.`,
  invalid_chars: '영문 소문자, 숫자, 밑줄(_)만 쓸 수 있어요.',
  reserved: '이미 서비스가 쓰고 있는 주소예요. 다른 아이디를 골라 주세요.',
};

/**
 * 입력을 저장 가능한 형태로 다듬는다 (공백 제거 + 소문자).
 *
 * 사용자가 대문자로 쳤다고 거절하기보다 조용히 낮춰 준다 —
 * 대문자 금지는 우리 사정이지 사용자의 실수가 아니다.
 */
export const normalizeUsername = (input: string): string =>
  input.trim().toLowerCase();

/**
 * 아이디가 규칙에 맞는지 본다. **중복은 보지 않는다** (DB 를 봐야 알 수 있다).
 *
 * @param input 사용자가 친 값 (다듬기 전 원본을 그대로 넘겨도 된다)
 */
export const validateUsername = (input: string): UsernameCheck => {
  const value = normalizeUsername(input);

  if (value.length === 0) {
    return { ok: false, issue: 'empty', message: MESSAGES.empty };
  }
  if (value.length < USERNAME_MIN_LENGTH) {
    return { ok: false, issue: 'too_short', message: MESSAGES.too_short };
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return { ok: false, issue: 'too_long', message: MESSAGES.too_long };
  }
  // 길이를 먼저 보는 이유: 'ab!' 처럼 둘 다 틀렸을 때 더 고치기 쉬운 쪽을 알려 준다
  if (!USERNAME_PATTERN.test(value)) {
    return {
      ok: false,
      issue: 'invalid_chars',
      message: MESSAGES.invalid_chars,
    };
  }
  if (RESERVED_USERNAMES.has(value)) {
    return { ok: false, issue: 'reserved', message: MESSAGES.reserved };
  }

  return { ok: true, value };
};

/**
 * 가입 시 이메일에서 아이디 후보를 만든다.
 *
 * 기존 구현에는 결함이 세 개 있었다.
 * 1. `한글@naver.com` 처럼 ASCII 가 없는 주소면 **빈 문자열**이 나와
 *    로그인 후 `/${''}` = `/` 로 튕겼다.
 * 2. 2자 이하 주소(`ab@`)가 그대로 통과해 길이 규칙을 깼다.
 * 3. `admin@` 이면 예약어와 충돌했다.
 * 여기서는 셋 다 막고, 못 쓰는 값이면 `reader` 접두사로 갈아탄다.
 *
 * @returns 형식·예약어 규칙을 통과하는 후보 (중복 여부는 호출한 쪽이 확인한다)
 */
export const generateUsernameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] ?? '';
  const cleaned = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, USERNAME_MAX_LENGTH);

  // 규칙을 통과하지 못하는 후보는 쓰지 않는다 — 무작위 접미사로 대체된다
  return validateUsername(cleaned).ok ? cleaned : 'reader';
};
