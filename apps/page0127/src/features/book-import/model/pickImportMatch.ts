import type { MatchQuery } from './types';
import type { ProviderBook } from '@/entities/book';

/**
 * 검색 후보 중에서 그 줄이 말하는 책을 고른다. 확신이 없으면 `null` — 사용자가 고른다.
 *
 * 왜 첫 번째 결과를 그냥 쓰지 않는가: 공급자 검색은 "관련도+인기" 순이라
 * "데미안"을 찾으면 원작보다 해설서·필사 노트가 먼저 나올 때가 있다. 잘못 고른 책을
 * 조용히 담는 것보다 "골라 주세요"로 남기는 편이 낫다 — 확인 화면이 그걸 위해 있다.
 *
 * 점수:
 * - 제목이 같다 (띄어쓰기·문장부호·괄호 속 판 정보 무시) → 3
 * - 후보 제목이 줄의 제목으로 시작한다 ("사피엔스" → "사피엔스 (리커버)") → 1
 * - 저자가 겹친다 → 2 / 저자를 적었는데 안 겹친다 → -2
 *
 * 3점 이상(제목이 같음)이어야 자동으로 고른다. 저자까지 맞으면 동점 중에서도 앞선다.
 */
export const pickImportMatch = (
  query: MatchQuery,
  candidates: ProviderBook[]
): number | null => {
  if (candidates.length === 0) return null;
  // ISBN 으로 찾은 책은 그 책이다
  if (query.isbn && candidates[0].isbn === query.isbn) return 0;

  const wantTitle = normalizeTitle(query.title);
  if (!wantTitle) return null;
  const wantAuthors = splitAuthors(query.author);

  let bestIndex = 0;
  let bestScore = -Infinity;
  candidates.forEach((book, index) => {
    const title = normalizeTitle(book.title);
    let score = 0;
    if (title === wantTitle) score += 3;
    else if (title.startsWith(wantTitle)) score += 1;

    if (wantAuthors.length > 0) {
      const authors = normalizeText(book.author);
      score += wantAuthors.some((a) => authors.includes(a)) ? 2 : -2;
    }

    // 동점이면 앞선 후보(공급자 순서)를 둔다
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestScore >= 3 ? bestIndex : null;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? '').toLowerCase().replace(/[\s.,:;!?'"‘’“”·~\-–—_/]/g, '');

/** 괄호 속 판 정보("(개정판)", "[양장]")와 부제(":" 뒤)를 떼고 비교한다 */
export const normalizeTitle = (value: string) =>
  normalizeText(
    value.replace(/[([{【].*?[)\]}】]/g, '').split(/\s[:\-–—]\s|:/)[0]
  );

/** "유발 하라리 (지은이), 조현욱 (옮긴이)" 같은 표기에서 사람 이름만 뽑는다 */
const splitAuthors = (value: string | null) =>
  (value ?? '')
    .replace(/[([{].*?[)\]}]/g, '')
    .split(/[,&/·]| 외/)
    .map(normalizeText)
    .filter((name) => name.length >= 2);
