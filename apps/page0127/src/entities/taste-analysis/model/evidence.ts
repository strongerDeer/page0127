import type { TasteEvidence } from '../types';

/** 근거로 남기는 최대 권수 */
export const EVIDENCE_MAX = 5;
/** 근거 한 줄 최대 길이 — 넘치면 자른다(화면이 한두 줄에 담는다) */
export const EVIDENCE_REASON_MAX = 60;

/** 분석에 넣은 책 — 근거는 이 목록에서만 나온다 */
export type EvidenceSource = {
  id: string;
  title: string;
  cover_image: string | null;
};

/**
 * 프롬프트에서 책을 가리키는 번호. 응답은 제목이 아니라 이 번호로 책을 고른다 —
 * 번호는 실제 목록에서만 나오므로 지어낸 책이 근거로 들어올 수 없다.
 */
export const toBookKey = (index: number): string => `B${index + 1}`;

/** 제목 대조용 — 띄어쓰기·문장부호·대소문자 차이는 같은 책으로 본다 */
const normalizeTitle = (title: string): string =>
  title
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

const clip = (text: string): string => {
  const chars = [...text];
  return chars.length > EVIDENCE_REASON_MAX
    ? `${chars.slice(0, EVIDENCE_REASON_MAX - 1).join('')}…`
    : text;
};

/**
 * AI 응답의 evidence → 저장할 근거.
 *
 * 1. 번호(B3)로 책을 찾고, 번호가 없으면 제목으로 찾는다. 목록에 없으면 버린다(지어낸 책)
 * 2. 같은 책은 한 번, 이유가 비면 버린다
 * 3. 주제는 좋아하는 주제(liked.topics)에 있는 것만 — 태그와 근거가 서로 이어져야 한다
 * 4. 최대 EVIDENCE_MAX 권. 모양이 이상하면 빈 배열(분석 저장은 막지 않는다)
 */
export const toTasteEvidence = (
  raw: unknown,
  books: EvidenceSource[],
  likedTopics: string[]
): TasteEvidence[] => {
  if (!Array.isArray(raw)) return [];

  const byKey = new Map(books.map((book, i) => [toBookKey(i), book]));
  const byTitle = new Map(
    books.map((book) => [normalizeTitle(book.title), book])
  );
  const liked = new Set(likedTopics.map((topic) => topic.trim()));
  const seen = new Set<string>();
  const evidence: TasteEvidence[] = [];

  for (const item of raw) {
    if (evidence.length >= EVIDENCE_MAX) break;
    if (!item || typeof item !== 'object') continue;
    const { book, title, reason, topics } = item as Record<string, unknown>;

    const source =
      (typeof book === 'string' && byKey.get(book.trim().toUpperCase())) ||
      (typeof title === 'string' && byTitle.get(normalizeTitle(title))) ||
      null;
    const text = typeof reason === 'string' ? reason.trim() : '';
    if (!source || !text || seen.has(source.id)) continue;
    seen.add(source.id);

    evidence.push({
      book_id: source.id,
      title: source.title,
      cover_image: source.cover_image,
      reason: clip(text),
      topics: Array.isArray(topics)
        ? [
            ...new Set(
              topics
                .filter((topic): topic is string => typeof topic === 'string')
                .map((topic) => topic.trim())
                .filter((topic) => liked.has(topic))
            ),
          ]
        : [],
    });
  }

  return evidence;
};
