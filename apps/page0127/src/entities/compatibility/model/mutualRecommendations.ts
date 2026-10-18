import type { Book } from '@/entities/book';

type AiRecommendation = {
  title?: unknown;
  author?: unknown;
  reason?: unknown;
};

type Ids = { fromUserId: string; toUserId: string; analysisId: string };

// 공백·문장부호를 제거한 소문자 비교로 표기 흔들림을 흡수
const normalize = (title: string) =>
  title.toLowerCase().replace(/[\s\-–—:·,."'“”‘’()[\]]/g, '');

const MAX_RECOMMENDATIONS = 3;

/**
 * AI 추천(제목/저자/이유)을 mutual_recommendations insert 행으로 변환
 * 제목을 원본 책 목록과 매칭해 표지·ISBN·출판사를 확보한다
 *
 * 받는 사람이 이미 가진 책은 뺀다 — 프롬프트로도 막지만 AI 가 어기면 여기서 거른다.
 * 2026-10-18 로컬 확인: 겹치는 책이 많은 두 사람에게 6권 중 4권을 "이미 읽은 책"으로 추천했다.
 * 같은 ISBN 이거나(표기가 달라도) 정규화한 제목이 같으면 같은 책으로 본다.
 * 거른 뒤에 3권으로 자른다 — 먼저 자르면 거를수록 모자란다.
 */
export function mapRecommendations(
  aiRecs: unknown,
  sourceBooks: Book[],
  receiverBooks: Pick<Book, 'title' | 'isbn'>[],
  ids: Ids
) {
  if (!Array.isArray(aiRecs)) return [];

  const receiverIsbns = new Set(
    receiverBooks.map((book) => book.isbn).filter(Boolean)
  );
  const receiverTitles = new Set(
    receiverBooks.map((book) => normalize(book.title))
  );

  return aiRecs
    .filter(
      (rec): rec is AiRecommendation & { title: string; reason: string } =>
        typeof (rec as AiRecommendation).title === 'string' &&
        typeof (rec as AiRecommendation).reason === 'string'
    )
    .map((rec) => ({
      rec,
      matched: sourceBooks.find(
        (book) =>
          normalize(book.title) === normalize(rec.title) ||
          normalize(book.title).includes(normalize(rec.title)) ||
          normalize(rec.title).includes(normalize(book.title))
      ),
    }))
    .filter(({ rec, matched }) => {
      if (matched?.isbn && receiverIsbns.has(matched.isbn)) return false;
      return !receiverTitles.has(normalize(matched?.title ?? rec.title));
    })
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ rec, matched }, idx) => {
      return {
        compatibility_analysis_id: ids.analysisId,
        from_user_id: ids.fromUserId,
        to_user_id: ids.toUserId,
        isbn: matched?.isbn ?? null,
        title: matched?.title ?? rec.title,
        author:
          matched?.author ??
          (typeof rec.author === 'string' ? rec.author : null),
        publisher: matched?.publisher ?? null,
        cover_image: matched?.cover_image ?? null,
        category: matched?.category ?? null,
        reason: rec.reason,
        display_order: idx + 1,
      };
    });
}
