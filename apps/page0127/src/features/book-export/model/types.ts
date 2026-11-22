import type { BookStatus } from '@/entities/book';

/**
 * 내보내기에 쓰는 책 한 줄 — books 테이블에서 사람이 남긴 기록만 고른다.
 * (표지 URL·책등·목차 같은 공급자 메타데이터는 다시 받을 수 있으니 뺀다)
 */
export type ExportBook = {
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  status: BookStatus;
  read_count: number;
  start_date: string | null;
  completed_date: string | null;
  completed_year: number | null;
  rating: number | null;
  is_life_book: boolean;
  one_line_review: string | null;
  personal_memo: string | null;
  tags: string[] | null;
  is_public: boolean;
  created_at: string;
};

export type ExportQuote = {
  isbn: string;
  text: string;
  page: number | null;
  created_at: string;
};

export type ExportFormat = 'csv' | 'md';

/** 화면·CSV·Markdown 이 같은 이름을 쓰게 한 곳에 둔다 — 가져오기(parseStatus)가 이 글자를 읽는다 */
export const STATUS_LABEL: Record<BookStatus, string> = {
  completed: '완독',
  reading: '읽는 중',
  want_to_read: '읽고 싶음',
};
