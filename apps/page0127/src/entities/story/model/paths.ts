export const storyPath = (slug: string) => `/blog/${slug}`;

/**
 * 글 공유 이미지(og:image) 주소 — 뒤에 수정 시각을 붙여 저장할 때마다 주소가 바뀌게 한다.
 * 주소가 같으면 CDN·카카오톡이 옛 그림을 계속 보여 준다(2026-11-24).
 */
export const storyShareImagePath = (slug: string, updatedAt: string) => {
  const version = new Date(updatedAt).getTime();
  const base = `${storyPath(slug)}/share-image`;
  return Number.isNaN(version) ? base : `${base}?v=${version}`;
};

/** 상대 경로(/images/...)는 사이트 주소를 붙여 절대 주소로 — JSON-LD·사이트맵·OG 는 절대 주소가 필요하다 */
export const absoluteImageUrl = (src: string, siteUrl: string) =>
  /^https?:\/\//.test(src) ? src : `${siteUrl}${src}`;

/**
 * ISO 시각 → "2026년 11월 23일" (한국 날짜).
 * 서버(UTC)에서 그려도 한국 날짜가 나오게 시간대를 고정한다.
 */
export const formatStoryDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/** ISO 시각 → 2026.11.23 (한국 날짜) */
export const formatStoryShortDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return parts.replaceAll('-', '.');
};

/**
 * 책 한 권의 독후감인가 — 책이 연결됐고, 독후감으로 고른 글(HJ 2026-11-27).
 * 책을 연결해도 필사 소개처럼 독후감이 아닌 글은 "독서 이야기"다.
 */
export const isBookReview = (story: {
  bookId: string | null;
  isReview: boolean;
}) => Boolean(story.bookId) && story.isReview;

/** 목록·공유 카드의 글 종류 */
export const storyKindLabel = (story: {
  bookId: string | null;
  isReview: boolean;
}) => (isBookReview(story) ? '책 한 권' : '독서 이야기');
