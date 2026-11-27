/**
 * 책 정보 페이지(/books/info/[id])를 검색엔진에 올릴지 정하는 기준 (HJ A안, 2026-11-23).
 *
 * 왜 기준이 필요한가: 대부분의 책 정보 페이지는 본문이 서점 소개 글이라 다른 사이트와 겹친다.
 * 얇은 페이지를 많이 내밀수록 사이트 전체 평가가 깎이므로, page0127만의 내용이 있는 책만 알린다.
 *   - 리더 2명 이상: "이 책을 읽은 리더 N명"·별점이 의미 있는 숫자가 된다
 *   - "이 책에 남긴 말"(책 정보 페이지 댓글) 1개 이상: 사람들이 직접 남긴 문장이 있다
 *   - 블로그 책 이야기(독후감·인물관계도)가 연결돼 있다
 * 나머지는 noindex, follow — 검색 결과엔 안 올리되 안의 링크(서재·다른 책)는 따라가게 둔다.
 *
 * 집계 당시(2026-11-23): 252권 중 리더 0명 84 · 1명 164 · 2명 4 → 4권만 색인.
 * 리더가 늘면 자동으로 늘어난다. 기준을 바꿀 땐 이 숫자 하나만 고친다.
 */
export const BOOK_INDEX_MIN_READERS = 2;

/** "이 책을 읽은 리더"로 세는 상태 — 책 정보 페이지의 리더 수(getPublicReaderTotal)와 같은 기준 */
const READER_STATUSES = new Set(['reading', 'completed']);

export type BookIndexSignals = {
  /** 공개 기록으로 이 책을 읽는 중·완독한 사람 수 */
  readerCount: number;
  /** "이 책에 남긴 말" 댓글이 있거나, 블로그 책 이야기가 연결돼 있는가 */
  hasStory: boolean;
};

export const isBookIndexable = ({
  readerCount,
  hasStory,
}: BookIndexSignals): boolean =>
  hasStory || readerCount >= BOOK_INDEX_MIN_READERS;

type PublicBookRow = {
  isbn: string | null;
  user_id: string;
  status: string | null;
};

/**
 * 공개 책 행 → ISBN 별 리더 수. 재독으로 한 사람이 여러 행이어도 한 명으로 센다.
 * sitemap 이 책마다 따로 묻지 않고 한 번에 세려고 쓴다.
 */
export const countReadersByIsbn = (
  rows: PublicBookRow[]
): Map<string, number> => {
  const readers = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.isbn || !row.status || !READER_STATUSES.has(row.status)) continue;
    const set = readers.get(row.isbn) ?? new Set<string>();
    set.add(row.user_id);
    readers.set(row.isbn, set);
  }
  return new Map([...readers].map(([isbn, set]) => [isbn, set.size]));
};

type BookDescriptionInput = {
  title: string;
  author: string | null;
  readerCount: number;
  /** 평균 별점 (0 이면 평가 없음 — summarizeRatings 기준) */
  avgRating: number;
  ratingCount: number;
};

/**
 * 책 정보 meta description — 출판사 소개 글 대신 page0127 만의 정보로 만든다.
 *
 * 예) "불편한 편의점 - 김호연 | 리더 3명이 읽은 책, 평균 ★4.2"
 * 출판사 소개를 그대로 쓰면 같은 책을 다루는 모든 사이트와 문장이 겹친다(중복 콘텐츠).
 * 이 페이지에만 있는 사실(누가 몇 명 읽었나, 어떻게 평가했나)을 앞세운다.
 */
export const buildBookMetaDescription = ({
  title,
  author,
  readerCount,
  avgRating,
  ratingCount,
}: BookDescriptionInput): string => {
  const head = author ? `${title} - ${author}` : title;

  if (readerCount === 0) {
    return `${head} | page0127.에서 이 책의 첫 리더가 되어 독서 기록을 남겨 보세요.`;
  }

  const rating = ratingCount > 0 ? `, 평균 ★${avgRating.toFixed(1)}` : '';
  return `${head} | 리더 ${readerCount}명이 읽은 책${rating}. page0127.에서 이 책을 읽은 사람들의 기록을 만나 보세요.`;
};
