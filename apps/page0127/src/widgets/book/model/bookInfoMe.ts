import type { ReaderEntry } from './bookReaders';
import type { Book } from '@/entities/book';

/** 책 정보 화면 "나의 기록"에 필요한 필드만 */
export type MyBookMemoData = Pick<
  Book,
  | 'status'
  | 'rating'
  | 'is_life_book'
  | 'one_line_review'
  | 'personal_memo'
  | 'tags'
>;

/** GET /api/books/info/[isbn]/me 응답 — 책 정보 페이지의 "나만의 부분" */
export type BookInfoMe = {
  /** 내 서재에 이 책이 있나 (담기 버튼) */
  isInLibrary: boolean;
  /** 나의 기록 — 서재에 없으면 null */
  myBook: MyBookMemoData | null;
  /** 나와 이어진 리더(나·팔로잉·팔로워) 얼굴과 그 수 */
  readers: { items: ReaderEntry[]; total: number };
};
