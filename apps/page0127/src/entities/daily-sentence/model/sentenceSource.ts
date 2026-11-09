import type { DailySentence } from './types';

/**
 * 출처 한 줄 — 《책 제목》 · 저자 · 옮긴이 · p.12
 * 카드·캘린더·(다음) 공유 카드가 같은 표기를 쓰도록 한곳에 둔다.
 */
export const formatSentenceSource = (
  sentence: Pick<DailySentence, 'book_title' | 'author' | 'translator' | 'page'>
): string =>
  [
    `《${sentence.book_title}》`,
    sentence.author,
    sentence.translator && `${sentence.translator} 옮김`,
    sentence.page && `p. ${sentence.page}`,
  ]
    .filter(Boolean)
    .join(' · ');
