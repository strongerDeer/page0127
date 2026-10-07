/** next.config 의 images.remotePatterns 중 도서 이미지가 쓰는 고정 호스트 */
const BOOK_IMAGE_HOSTS = new Set(['image.yes24.com']);

/**
 * next/image 로 그려도 되는 도서 이미지만 남긴다.
 *
 * 왜 필요한가: next/image 는 next.config 에 없는 호스트를 받으면 **렌더 중 예외**를
 * 던진다 — 이미지 한 장 때문에 페이지 전체가 500 이 된다. global_books 에는 YES24
 * 전환 전 알라딘 주소(image.aladin.co.kr)가 아직 남아 있다.
 * 저장소는 '이 환경의' Supabase 만 허용된다(이미지 설정·CSP 둘 다 env 에서 파생).
 */
export const toRenderableSrc = (
  url: string | null,
  storageOrigin: string
): string | null => {
  if (!url) return null;
  try {
    const { hostname, origin } = new URL(url);
    if (BOOK_IMAGE_HOSTS.has(hostname)) return url;
    if (origin === new URL(storageOrigin).origin) return url;
    return null;
  } catch {
    return null;
  }
};
