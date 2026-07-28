/**
 * 로그인이 필요한 경로 판정 — 미들웨어와 클라이언트가 함께 쓴다.
 *
 * 왜 한 곳에 모으는가: 미들웨어는 "막을 곳"을, 로그아웃은 "머물러도 되는 곳"을
 * 알아야 하는데 둘은 같은 질문이다. 각자 목록을 들고 있으면 한쪽만 고쳐져
 * "로그아웃했더니 접근 못 하는 페이지에 남는" 어긋남이 생긴다.
 */

/**
 * 보호된 경로 prefix — app/(protected) 그룹과 동기화한다.
 * 여기에 누락되더라도 (protected)/layout.tsx 의 가드가 안전망으로 동작한다.
 * '/dashboard'는 로그인 사용자의 /{username}으로 리다이렉트만 하는 얇은 스텁이라 뺀다.
 */
export const PROTECTED_PREFIXES = [
  '/admin',
  '/books',
  '/feed',
  '/search',
  '/settings',
  '/notifications',
] as const;

/**
 * /books 하위지만 로그인 없이 열어두는 경로 — app/(public)/books 와 동기화한다.
 * 카탈로그와 책 정보는 서비스의 얼굴이자 SEO 자산이다.
 * 로그인은 "담아둘 때" 필요하지 "구경할 때" 필요한 게 아니다.
 */
export const PUBLIC_EXCEPTIONS = ['/books/all', '/books/info'] as const;

const startsWithSegment = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * 이 경로가 로그인을 요구하는가.
 *
 * 공개 예외가 보호 목록보다 우선한다 — `/books/info/xxx` 는 `/books` 로 시작하지만
 * 누구나 볼 수 있어야 한다.
 */
export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_EXCEPTIONS.some((prefix) => startsWithSegment(pathname, prefix))) {
    return false;
  }
  return PROTECTED_PREFIXES.some((prefix) =>
    startsWithSegment(pathname, prefix)
  );
}
