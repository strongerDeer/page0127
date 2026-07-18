/**
 * HTML 엔티티 디코더
 *
 * 알라딘 API가 주는 책 소개에는 `&lt;이동진의 파이아키아&gt;`처럼
 * HTML 엔티티가 이스케이프된 채로 들어온다. DB에도 그대로 저장돼 있으므로
 * 화면에 보여주기 직전에 되돌린다. (React가 어차피 재이스케이프하므로 안전)
 */
const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&amp;': '&',
};

export const decodeHtmlEntities = (text: string): string =>
  text.replace(/&(?:lt|gt|quot|#39|apos|nbsp|amp);/g, (m) => ENTITIES[m] ?? m);
