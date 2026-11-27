import type { TasteEvidence } from '../types';

/** 공유 이미지에 싣는 근거 책 수 — 9:16 흰 면에 표지·제목·태그 한 줄씩 세 권이 꼭 맞는다 */
export const TASTE_STORY_EVIDENCE_MAX = 3;

/**
 * 성향 설명의 첫 문장 — 공유 이미지에는 한 문장만 싣는다.
 *
 * AI 설명은 서너 문장(200~300자)이라 그대로 넣으면 이미지가 글로 덮인다.
 * 문장 끝(. ! ? 와 그 뒤 공백·줄바꿈)에서 자르고, 끝 표시가 없으면 통째로 돌려준다
 * (줄 수 제한·말줄임은 그리는 쪽 wrapLines 가 맡는다).
 */
export const firstSentence = (description: string): string => {
  const text = description.trim();
  const match = text.match(/^[\s\S]+?[.!?。](?=\s|$)/);
  return (match ? match[0] : text).replace(/\s+/g, ' ').trim();
};

/**
 * 남에게 보여도 되는 근거 책만 앞에서부터 세 권.
 *
 * 왜 거르나: 분석은 **비공개 책까지** 넣어 돌린다. 주인이 부르면 RLS 도 비공개 책을 열어 주므로,
 * 공유 이미지(남이 보는 그림)에는 "지금 공개인 책"만 남겨야 숨긴 책이 새지 않는다.
 * get_public_taste_history 가 방문자에게 하는 것과 같은 규칙을, 주인이 부르는 이 이미지에도 적용한다.
 *
 * @param publicBookIds 지금 공개(is_public)인 내 책 id
 */
export const pickShareableEvidence = (
  evidence: readonly TasteEvidence[],
  publicBookIds: ReadonlySet<string>
): TasteEvidence[] =>
  evidence
    .filter((item) => publicBookIds.has(item.book_id))
    .slice(0, TASTE_STORY_EVIDENCE_MAX);
