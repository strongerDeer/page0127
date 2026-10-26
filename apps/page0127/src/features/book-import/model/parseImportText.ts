import { parseIsbn } from '@/features/book/lib/parseIsbn';

import { MAX_IMPORT_ROWS } from './limits';

import type { ImportParseResult, ImportRow } from './types';
import type { BookStatus } from '@/entities/book';

/**
 * 붙여넣은 표·CSV 파일 내용을 책 목록으로 읽는다.
 *
 * 받는 모양 세 가지:
 * - 엑셀·구글 시트에서 복사해 붙여넣은 표 (탭으로 나뉜다)
 * - CSV 파일 (쉼표, 따옴표 안의 쉼표·줄바꿈 포함). Goodreads 내보내기도 이 모양이다
 * - 머리글 없이 한 줄에 제목 하나 (메모장에 적어 둔 목록)
 *
 * 학습 포인트:
 * - 머리글은 **이름으로** 찾는다. 열 순서는 사람마다 다르고, "제목/책 제목/도서명"처럼
 *   부르는 이름도 다르다 → 별칭 목록과 비교한다
 * - 못 읽는 칸은 버리고 줄은 살린다. 별점 하나가 이상하다고 그 책을 빼면 안 된다
 */

const REVIEW_MAX_LENGTH = 300; // books_one_line_review_length 제약과 같다

type Column =
  'title' | 'author' | 'isbn' | 'date' | 'rating' | 'review' | 'status';

/** 공백·밑줄·괄호를 걷고 소문자로 비교한다 ("My Rating" = "myrating", "ISBN13" = "isbn13") */
const HEADER_ALIASES: Record<Column, string[]> = {
  title: ['제목', '책제목', '도서명', '책이름', '서명', 'title', 'booktitle'],
  author: ['저자', '작가', '지은이', '글쓴이', 'author', 'authors'],
  isbn: ['isbn', 'isbn13', 'isbn10'],
  date: [
    '읽은날짜',
    '읽은날',
    '완독일',
    '완독날짜',
    '다읽은날',
    '날짜',
    'dateread',
    'finished',
    'finisheddate',
  ],
  rating: ['별점', '평점', '점수', 'rating', 'myrating', 'stars'],
  review: ['한줄평', '한줄리뷰', '리뷰', '감상', 'review', 'myreview'],
  status: ['상태', '독서상태', 'status', 'shelf', 'exclusiveshelf'],
};

const normalizeHeader = (cell: string) =>
  cell.toLowerCase().replace(/[\s_\-()[\]]/g, '');

/**
 * 따옴표를 지키며 칸을 나눈다. 따옴표 안의 구분자·줄바꿈은 칸의 일부다.
 * `""` 는 따옴표 한 개다 (CSV 표준).
 */
export const splitTable = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim() === '') {
      // 칸 맨 앞의 따옴표만 따옴표 칸의 시작이다 (제목 중간의 " 는 글자다)
      cell = '';
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);

  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c !== ''));
};

/** 탭이 있으면 표 붙여넣기다. 제목에 쉼표가 흔해서 탭을 먼저 본다 */
const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return firstLine.includes('\t') ? '\t' : ',';
};

const findHeader = (
  cells: string[]
): Partial<Record<Column, number>> | null => {
  const map: Partial<Record<Column, number>> = {};
  cells.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    for (const [column, aliases] of Object.entries(HEADER_ALIASES) as [
      Column,
      string[],
    ][]) {
      // 먼저 나온 열을 쓴다 — Goodreads 는 ISBN·ISBN13 이 둘 다 있다
      if (map[column] === undefined && aliases.includes(key)) {
        map[column] = index;
      }
    }
  });
  // 제목이나 ISBN 열이 없으면 머리글이 아니라 첫 번째 책으로 본다
  return map.title !== undefined || map.isbn !== undefined ? map : null;
};

/** Goodreads 는 ISBN 을 `="9788937460449"` 로 감싸 내보낸다 (엑셀이 숫자로 바꾸지 못하게) */
const cleanIsbnCell = (cell: string) => cell.replace(/^=?"?|"?$/g, '');

/**
 * 읽은 날짜. "2024-03-05", "2024.3.5", "2024/03/05", "2024년 3월 5일" 을 받는다.
 * 연·월만 있거나 연도만 있으면 연도로 담는다 (등록 폼의 "연도만" 과 같다).
 */
export const parseReadDate = (
  cell: string
): { date: string | null; year: number | null } => {
  const none = { date: null, year: null };
  const value = cell.trim();
  if (!value) return none;

  const full = value.match(
    /^(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?\.?$/
  );
  if (full) {
    const [, y, m, d] = full;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const probe = new Date(Date.UTC(year, month - 1, day));
    // 2024-02-31 같은 날짜는 Date 가 3월로 넘겨 버린다 → 되돌려 비교해 걸러 낸다
    if (
      !isPlausibleYear(year) ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day
    ) {
      return none;
    }
    return {
      date: `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year: null,
    };
  }

  const yearOnly = value.match(
    /^(\d{4})\s*(?:[.\-/년]\s*(?:\d{1,2}\s*월?)?)?\.?$/
  );
  if (yearOnly && isPlausibleYear(Number(yearOnly[1]))) {
    return { date: null, year: Number(yearOnly[1]) };
  }

  return none;
};

const isPlausibleYear = (year: number) => year >= 1900 && year <= 2100;

/**
 * 별점. "4", "4.5", "★★★★☆", "4/5", "8/10" 을 받아 1~5 정수로 맞춘다.
 * 0·빈칸은 "안 매김"이다 (Goodreads 는 안 매긴 책을 0 으로 내보낸다).
 */
export const parseRating = (cell: string): ImportRow['rating'] => {
  const value = cell.trim();
  if (!value) return null;

  const stars = (value.match(/★/g) ?? []).length;
  if (stars > 0) return clampRating(stars);

  const fraction = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)$/);
  if (fraction) {
    const scale = Number(fraction[2]);
    return scale > 0 ? clampRating((Number(fraction[1]) / scale) * 5) : null;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  // 10점 만점으로 적어 둔 표가 흔하다 (5 넘는 값은 10점 만점으로 본다)
  return clampRating(num > 5 && num <= 10 ? num / 2 : num);
};

const clampRating = (value: number): ImportRow['rating'] => {
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return null;
  return rounded as ImportRow['rating'];
};

/** 상태 열. 모르는 값이면 null → 확인 화면에서 고른 기본 상태를 쓴다 */
export const parseStatus = (cell: string): BookStatus | null => {
  const value = normalizeHeader(cell);
  if (!value) return null;
  if (/^(read|완독|읽음|다읽음|읽은책|완료)$/.test(value)) return 'completed';
  if (/^(reading|currentlyreading|읽는중|읽고있음|읽는책)$/.test(value)) {
    return 'reading';
  }
  if (/^(toread|wanttoread|읽고싶음|읽고싶은책|읽을책|위시)$/.test(value)) {
    return 'want_to_read';
  }
  return null;
};

const toRow = (
  cells: string[],
  header: Partial<Record<Column, number>> | null,
  line: number
): ImportRow | null => {
  const at = (column: Column) => {
    const index = header?.[column];
    return index === undefined ? '' : (cells[index] ?? '');
  };

  let title: string;
  let author: string;
  let isbn: string | null;

  if (header) {
    title = at('title');
    author = at('author');
    isbn = parseIsbn(cleanIsbnCell(at('isbn')));
  } else {
    // 머리글이 없으면 ISBN 처럼 생긴 칸을 ISBN 으로, 나머지 앞 두 칸을 제목·저자로 본다
    const isbnIndex = cells.findIndex((c) => parseIsbn(cleanIsbnCell(c)));
    isbn = isbnIndex >= 0 ? parseIsbn(cleanIsbnCell(cells[isbnIndex])) : null;
    const rest = cells.filter((_, i) => i !== isbnIndex);
    title = rest[0] ?? '';
    author = rest[1] ?? '';
  }

  if (!title && !isbn) return null;

  const { date, year } = parseReadDate(at('date'));
  const review = at('review');

  return {
    line,
    title,
    author: author || null,
    isbn,
    status: parseStatus(at('status')),
    completedDate: date,
    completedYear: year,
    rating: parseRating(at('rating')),
    review: review ? review.slice(0, REVIEW_MAX_LENGTH) : null,
  };
};

export const parseImportText = (input: string): ImportParseResult => {
  // 엑셀이 저장한 UTF-8 CSV 는 맨 앞에 BOM 이 붙는다 — 남겨 두면 첫 머리글이 "﻿제목"이 된다
  const text = input.replace(/^﻿/, '');
  const table = splitTable(text, detectDelimiter(text));
  if (table.length === 0) return { rows: [], truncated: 0 };

  const header = findHeader(table[0]);
  const body = header ? table.slice(1) : table;
  // 줄 번호는 사람이 보는 번호다 (머리글이 1번째 줄)
  const firstLine = header ? 2 : 1;

  const rows = body
    .map((cells, i) => toRow(cells, header, firstLine + i))
    .filter((row): row is ImportRow => row !== null);

  return {
    rows: rows.slice(0, MAX_IMPORT_ROWS),
    truncated: Math.max(0, rows.length - MAX_IMPORT_ROWS),
  };
};
