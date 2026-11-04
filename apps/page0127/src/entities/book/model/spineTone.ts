/**
 * 책등 이미지가 없는 책의 색 번호(0~7)를 책마다 고정으로 고른다.
 *
 * 왜 무작위가 아니라 고정인가: Math.random 으로 고르면 새로고침할 때마다 색이 바뀌고,
 * 서버와 브라우저가 다른 색을 그려 hydration 경고가 난다. 책 id 로 해시하면
 * 같은 책은 어디서나 같은 색이고, 여러 권은 고르게 흩어진다.
 *
 * 색 값은 아래 SPINE_TONE_COLORS 다. 서재 책장(PublicBookShelf.module.css 의
 * `[data-tone]`)도 같은 여덟 색을 쓴다 — spineTone.test.ts 가 둘이 어긋나지 않게 지킨다.
 */
export const SPINE_TONE_COUNT = 8;

/**
 * 밝은 여덟 색(코랄·머스터드·민트·하늘·라벤더·핑크·오렌지·연두).
 * 짙은 천 장정 색은 칙칙하다는 의견(HJ, 2026-10-31)으로 바꿨다.
 * 모두 밝아서 짙은 먹색 글자(#1f1d1a)와 대비가 7:1 이상이다.
 */
export const SPINE_TONE_COLORS = [
  '#ff8a7a',
  '#ffc94d',
  '#6fd3b0',
  '#6ab4f0',
  '#b39cff',
  '#ff9ec7',
  '#ffa55c',
  '#9ad86a',
] as const;

export const spineTone = (key: string): number => {
  // FNV-1a — 짧은 문자열을 고르게 흩는 가벼운 해시
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SPINE_TONE_COUNT;
};
