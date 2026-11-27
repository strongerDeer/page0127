/**
 * 책 이야기 그림 주소 규칙 — 본문 그림(마크다운 이미지)과 관계도·대표 이미지가 같이 쓴다.
 *
 * 그림 주소는 두 곳만 받는다(allowlist) — 어드민에서 올린 story-images 버킷, 리포의 public/images/stories.
 * 아무 외부 주소나 공개 페이지에 뜨지 않게 하고(핫링크·추적 픽셀 X), 늘 미리 줄인 파일만 그리게 한다.
 *
 * 공개 페이지(서버)·어드민 미리보기(브라우저)·저장 검사(서버 액션)가 모두 이 함수 하나로 판정한다.
 * 그래서 entities 층에 둔다 — features(어드민)도 entities 를 import 할 수 있지만 반대는 안 된다(FSD).
 */
export const STORY_IMAGE_BUCKET = 'story-images';

/** 주소 끝의 #가로x세로 — 본문 그림의 크기. 브라우저는 # 뒤를 서버로 보내지 않는다 */
const SIZE_HASH = /#(\d{1,5})x(\d{1,5})$/;

const stripHash = (src: string) => src.replace(/#.*$/, '');

export const isAllowedImageSrc = (
  src: string,
  supabaseUrl: string | undefined
): boolean => {
  const path = stripHash(src);
  if (/^\/images\/stories\/[a-z0-9/_-]+\.(webp|png|jpe?g)$/i.test(path))
    return true;
  if (!supabaseUrl) return false;
  const prefix = `${supabaseUrl}/storage/v1/object/public/${STORY_IMAGE_BUCKET}/`;
  // 버킷 안 파일 이름만 — ../ 로 다른 버킷을 가리키지 못하게
  return (
    path.startsWith(prefix) &&
    /^[a-z0-9-]+\.(webp|png|jpe?g)$/i.test(path.slice(prefix.length))
  );
};

/**
 * 본문에 넣을 주소 — 올린 그림 주소 뒤에 크기를 붙인다(#1200x630).
 * 크기를 알아야 그림이 뜨기 전에 자리를 잡아 글이 밀리지 않는다(CLS).
 */
export const withImageSize = (
  src: string,
  size: { width: number; height: number }
) => `${stripHash(src)}#${size.width}x${size.height}`;

/** #가로x세로 를 읽는다. 없거나 0 이면 null */
export const readImageSize = (
  src: string
): { width: number; height: number } | null => {
  const match = SIZE_HASH.exec(src);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? { width, height } : null;
};

/** 본문 마크다운의 그림 주소들 — 저장할 때 허용 주소인지 검사한다 */
export const findBodyImageSrcs = (body: string): string[] =>
  [...body.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)/g)].map((match) => match[1]);
