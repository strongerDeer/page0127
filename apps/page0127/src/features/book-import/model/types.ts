import type { BookRating, BookStatus, ProviderBook } from '@/entities/book';

/**
 * 붙여넣기·CSV 한 줄을 읽어 낸 값.
 *
 * 표에서 몇 번째 줄이었는지(`line`, 머리글 = 1, 빈 줄은 세지 않는다)를 들고 다닌다 —
 * 확인 화면이 원본 순서를 지키고, 사용자가 원본에서 그 줄을 찾아갈 수 있게 한다.
 */
export type ImportRow = {
  line: number;
  title: string;
  author: string | null;
  /** 체크 숫자까지 맞는 ISBN13. 없거나 틀리면 null (제목으로 찾는다) */
  isbn: string | null;
  /** 파일에 상태 열이 있을 때만 값이 있다. 없으면 확인 화면에서 고른 기본 상태를 쓴다 */
  status: BookStatus | null;
  completedDate: string | null;
  completedYear: number | null;
  rating: Exclude<BookRating, 0> | null;
  review: string | null;
};

export type ImportParseResult = {
  rows: ImportRow[];
  /** 한 번에 담을 수 있는 권수를 넘겨 잘린 줄 수 */
  truncated: number;
};

/** 매칭 API 에 보내는 한 줄 — 찾는 데 필요한 것만 보낸다 */
export type MatchQuery = Pick<ImportRow, 'title' | 'author' | 'isbn'>;

export type MatchResult = {
  /** 고를 수 있는 후보. 비어 있으면 못 찾은 것이다 */
  candidates: ProviderBook[];
  /** 자동으로 고른 후보 번호. 확신이 없으면 null — 사용자가 고른다 */
  picked: number | null;
};

export type MatchResponse = {
  results: MatchResult[];
  /** 이미 서재에 있는 책 — 후보를 바꿔 골라도 화면에서 바로 판정하도록 식별자를 통째로 준다 */
  existing: { isbns: string[]; providerItemIds: string[] };
};

/**
 * 등록 API 에 보내는 한 권.
 *
 * 제목·표지 같은 책 정보는 보내지 않는다. 서버가 ISBN 으로 공급자에서 다시 받는다 —
 * 클라이언트가 보낸 메타데이터를 그대로 `global_books` 에 넣으면 공용 카탈로그를
 * 아무나 고쳐 쓸 수 있게 된다.
 */
export type ImportBookPayload = {
  isbn: string;
  status: BookStatus;
  completed_date: string | null;
  completed_year: number | null;
  rating: Exclude<BookRating, 0> | null;
  one_line_review: string | null;
  /** 브라우저에서 책등 이미지가 진짜인지 확인했으면 true (`resolveSpineImageUrl`) */
  spine_ok: boolean;
};

export type ImportResponse = { added: number; skipped: number; failed: number };
