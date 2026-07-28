/**
 * 로그인 후 돌아갈 경로를 안전한 내부 경로로만 좁힌다.
 *
 * 왜 검증이 필요한가 (오픈 리다이렉트):
 * - `?redirect=` 값을 그대로 믿고 이동하면, 공격자가 만든 링크
 *   (`/login?redirect=https://evil.com`)를 누른 사용자가 **로그인 직후** 외부
 *   사이트로 튕겨나간다. 우리 도메인에서 출발했으므로 사용자는 의심하지 않고,
 *   그곳의 가짜 로그인 화면에 자격 증명을 넣기 쉽다.
 * - 그래서 "우리 사이트 안의 경로"만 통과시킨다.
 *
 * 막는 형태:
 * - `https://evil.com` — 절대 URL
 * - `//evil.com` — 프로토콜 상대 URL. 브라우저가 현재 프로토콜의 외부 주소로 읽는다
 * - `/\evil.com` — 일부 브라우저가 백슬래시를 슬래시처럼 다룬다
 * - 앞뒤 공백으로 위 검사를 피하려는 시도
 * - `/login` — 로그인 페이지로 돌려보내면 왕복만 반복한다
 *
 * @returns 안전한 내부 경로, 아니면 null (호출부가 기본 목적지를 정한다)
 */
export function toSafeRedirect(
  value: string | null | undefined
): string | null {
  if (!value) return null;

  // 공백을 남겨두면 ' //evil.com' 이 아래 검사를 통과한다
  const path = value.trim();

  if (!path.startsWith('/')) return null;
  // '//' 와 '/\' 는 둘 다 외부로 나가는 문이다
  if (path.startsWith('//') || path.startsWith('/\\')) return null;
  // 로그인 페이지로 되돌리면 로그인 → 로그인 왕복이 된다
  if (path === '/login' || path.startsWith('/login?')) return null;

  return path;
}
