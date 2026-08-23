/**
 * 이미 최적화되어 오는 원격 이미지의 호스트.
 *
 * next/image 는 기본적으로 모든 이미지를 Vercel 이미지 최적화(`/_next/image`)에
 * 통과시킨다. 그런데 이 호스트들이 주는 이미지는 이미 용도에 맞게 줄여진
 * 파일이라(알라딘 cover500 은 수십 KB) 다시 변환해 얻는 게 거의 없다.
 *
 * 얻는 게 없는데 비용은 실재한다 — Vercel 의 이미지 변환 횟수는 요금제별로
 * 한도가 있고, 한도를 넘기면 `/_next/image` 가 402 를 돌려준다. 그때
 * **브라우저 입장에선 이미지 로드 실패**라, 표지가 있는 책까지 대체 표지나
 * 깨진 이미지로 바뀐다. 2026-08-23 운영에서 실제로 이렇게 됐다.
 */
const PRE_OPTIMIZED_IMAGE_HOSTS = new Set(['image.aladin.co.kr']);

/**
 * 이 이미지를 next/image 의 최적화 없이 원본 그대로 내보낼지 판정한다.
 *
 * 호스트를 **정확히** 비교한다. `src.includes('image.aladin.co.kr')` 같은
 * 부분 문자열 판정은 `image.aladin.co.kr.evil.com` 처럼 이름만 흉내 낸
 * 도메인도 통과시킨다.
 *
 * 상대 경로(`/images/no-book.jpg`)는 URL 로 파싱되지 않아 false 가 된다 —
 * 로컬 정적 이미지는 지금처럼 최적화를 거친다.
 */
export const isPreOptimizedImageSrc = (src?: string | null): boolean => {
  if (!src) return false;

  try {
    return PRE_OPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
  } catch {
    // 상대 경로·빈 문자열 등 절대 URL 이 아닌 값
    return false;
  }
};
