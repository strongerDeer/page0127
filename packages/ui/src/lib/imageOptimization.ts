/**
 * Vercel 이미지 최적화(`/_next/image`)를 태우지 않고 원본 그대로 내보낼 호스트.
 *
 * next/image 는 기본적으로 모든 원격 이미지를 변환에 통과시킨다. 그런데 변환
 * 횟수에는 요금제별 한도가 있고, 넘기면 `/_next/image` 가 402 를 돌려준다.
 * 그때 **브라우저 입장에선 이미지 로드 실패**라 이미지가 통째로 사라진다.
 * 2026-08-23 표지가, 2026-08-25 프로필 사진이 실제로 이렇게 됐다.
 *
 * 판정 기준은 "변환해서 얻는 게 있는가" 하나다.
 * - 얻는 게 없다(이미 CDN 이 알맞게 줄여 준다) → 여기 넣는다.
 * - 얻는 게 있다(원본이 크다) → 최적화를 유지하되, 한도가 소진되면 그 이미지는
 *   **아예 안 보인다.** 즉 "안 보임"과 "크게 보임" 중 하나를 고르는 문제다.
 */

/** 호스트명이 정확히 일치해야 하는 것. */
const PRE_OPTIMIZED_EXACT_HOSTS = new Set(['image.aladin.co.kr']);

/**
 * 서브도메인 번호가 바뀌어 정확히 못 적는 것 — 접미사로 판정한다.
 *
 * 반드시 점(`.`)으로 시작해야 한다. `'supabase.co'` 로 적으면
 * `evil-supabase.co` 까지 통과한다.
 *
 * - `.googleusercontent.com` / `.kakaocdn.net` — 소셜 로그인 프로필 사진.
 *   두 CDN 모두 이미 작은 썸네일(수십 KB)을 준다. 변환 이득이 없다.
 * - `.supabase.co` — 우리가 올린 프로필 사진. 이쪽은 원본이 최대 4MB 라
 *   변환 이득이 **있지만**, 한도 소진 시 새 가입자의 사진이 100% 깨진다
 *   (캐시가 없으니 전부 새 변환이다). 크게 나가더라도 보이는 편을 택했다.
 *   원본 크기 문제는 업로드 시점 리사이즈로 따로 막는다.
 */
const PRE_OPTIMIZED_HOST_SUFFIXES = [
  '.googleusercontent.com',
  '.kakaocdn.net',
  '.supabase.co',
];

/**
 * 이 이미지를 next/image 의 최적화 없이 원본 그대로 내보낼지 판정한다.
 *
 * 호스트로만 판정한다. `src.includes('image.aladin.co.kr')` 같은 부분 문자열
 * 판정은 `image.aladin.co.kr.evil.com` 처럼 이름만 흉내 낸 도메인도 통과시킨다.
 *
 * 상대 경로(`/images/no-book.jpg`)는 URL 로 파싱되지 않아 false 가 된다 —
 * 로컬 정적 이미지는 지금처럼 최적화를 거친다.
 */
export const isPreOptimizedImageSrc = (src?: string | null): boolean => {
  if (!src) return false;

  try {
    const { hostname } = new URL(src);

    if (PRE_OPTIMIZED_EXACT_HOSTS.has(hostname)) return true;

    return PRE_OPTIMIZED_HOST_SUFFIXES.some((suffix) =>
      hostname.endsWith(suffix)
    );
  } catch {
    // 상대 경로·빈 문자열 등 절대 URL 이 아닌 값
    return false;
  }
};
