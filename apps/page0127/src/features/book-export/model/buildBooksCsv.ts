import { toKstDateKey } from '@/shared/lib/date';

import { STATUS_LABEL } from './types';

import type { ExportBook } from './types';

/**
 * 내 책 기록을 CSV 글자로 만든다.
 *
 * 학습 포인트:
 * - **머리글 이름을 가져오기와 맞춘다.** 가져오기(parseImportText)는 열을 순서가 아니라
 *   이름으로 찾는다. 앞 7열을 그 별칭(제목·저자·ISBN·상태·읽은 날짜·별점·한줄평)으로 쓰면
 *   내보낸 파일을 그대로 다시 가져올 수 있다 (왕복).
 * - **BOM(U+FEFF)을 맨 앞에 붙인다.** 엑셀은 BOM 이 없는 CSV 를 시스템 인코딩(한국어
 *   윈도우는 CP949)으로 읽어서 한글이 깨진다. 가져오기는 BOM 을 지우고 읽는다.
 * - **줄바꿈은 CRLF.** CSV 표준(RFC 4180)이 CRLF 다. 칸 안의 줄바꿈은 따옴표 안에 그대로 둔다.
 */

const BOM = '﻿';
const CRLF = '\r\n';

const HEADER = [
  '제목',
  '저자',
  'ISBN',
  '상태',
  '읽은 날짜',
  '별점',
  '한줄평',
  '출판사',
  '시작한 날',
  '회독',
  '인생책',
  '메모',
  '태그',
  '공개',
  '등록일',
] as const;

/**
 * 칸 하나를 CSV 규칙에 맞게 감싼다.
 *
 * 1. 엑셀 수식 막기(CSV 인젝션): `=`·`+`·`-`·`@`·탭·CR 로 시작하는 칸은 엑셀이 수식으로
 *    실행할 수 있다. 앞에 `'` 를 붙이면 글자로 보인다 (OWASP 권장).
 * 2. 쉼표·따옴표·줄바꿈이 있으면 `"..."` 로 감싸고, 안의 `"` 는 `""` 로 바꾼다.
 */
export const escapeCsvCell = (value: string): string => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * ISBN 은 엑셀이 숫자로 바꿔 `9.78894E+12` 로 망가뜨린다. `="9788937460449"` 로 적으면
 * 엑셀이 글자로 둔다 (Goodreads 내보내기와 같은 방법 — 가져오기의 cleanIsbnCell 이 벗긴다).
 * 수식 막기(escapeCsvCell)를 거치면 `'=` 가 되어 버리므로 따로 감싼다.
 */
export const isbnCell = (isbn: string): string =>
  /^\d{9,12}[\dX]$/i.test(isbn) ? `"=""${isbn}"""` : escapeCsvCell(isbn);

/** 완독 날짜가 없고 연도만 남긴 책은 연도만 적는다 — 가져오기도 연도만 받는다 */
const readDate = (book: ExportBook): string =>
  book.completed_date ??
  (book.completed_year ? String(book.completed_year) : '');

/** 0점·null 은 "별점 없음" 이라 비워 둔다 */
const rating = (value: number | null): string =>
  value && value > 0 ? String(value) : '';

/** 책 한 권 → CSV 한 줄. ISBN 칸만 따로 감싸고 나머지는 escapeCsvCell */
const toLine = (book: ExportBook): string => {
  const before = [book.title, book.author ?? ''].map(escapeCsvCell);
  const after = [
    STATUS_LABEL[book.status],
    readDate(book),
    rating(book.rating),
    book.one_line_review ?? '',
    book.publisher ?? '',
    book.start_date ?? '',
    String(book.read_count),
    book.is_life_book ? '인생책' : '',
    book.personal_memo ?? '',
    (book.tags ?? []).join(', '),
    book.is_public ? '공개' : '비공개',
    toKstDateKey(new Date(book.created_at)),
  ].map(escapeCsvCell);
  return [...before, isbnCell(book.isbn), ...after].join(',');
};

export const buildBooksCsv = (books: ExportBook[]): string => {
  const lines = [HEADER.map(escapeCsvCell).join(','), ...books.map(toLine)];
  return BOM + lines.join(CRLF) + CRLF;
};
