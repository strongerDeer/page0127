/**
 * 책등 이미지가 없는 책의 색 번호(0~7)를 책마다 고정으로 고른다.
 *
 * 왜 무작위가 아니라 고정인가: Math.random 으로 고르면 새로고침할 때마다 색이 바뀌고,
 * 서버와 브라우저가 다른 색을 그려 hydration 경고가 난다. 책 id 로 해시하면
 * 같은 책은 어디서나 같은 색이고, 여러 권은 고르게 흩어진다.
 *
 * 색 자체는 PublicBookShelf.module.css 의 `[data-tone]` 에 있다.
 */
export const SPINE_TONE_COUNT = 8;

export const spineTone = (key: string): number => {
  // FNV-1a — 짧은 문자열을 고르게 흩는 가벼운 해시
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % SPINE_TONE_COUNT;
};
