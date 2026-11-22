import { describe, expect, it } from 'vitest';

import { parseImportText } from '@/features/book-import/model/parseImportText';

import { buildBooksCsv, escapeCsvCell, isbnCell } from './buildBooksCsv';

import type { ExportBook } from './types';

const book = (overrides: Partial<ExportBook> = {}): ExportBook => ({
  isbn: '9788937460449',
  title: '데미안',
  author: '헤르만 헤세',
  publisher: '민음사',
  status: 'completed',
  read_count: 1,
  start_date: '2024-03-01',
  completed_date: '2024-03-05',
  completed_year: null,
  rating: 5,
  is_life_book: false,
  one_line_review: '새는 알을 깨고 나온다',
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2024-03-05T15:30:00.000Z',
  ...overrides,
});

describe('escapeCsvCell', () => {
  it('쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고 " 는 "" 로 바꾼다', () => {
    expect(escapeCsvCell('그냥 글')).toBe('그냥 글');
    expect(escapeCsvCell('사피엔스, 호모 데우스')).toBe(
      '"사피엔스, 호모 데우스"'
    );
    expect(escapeCsvCell('그가 "안녕" 했다')).toBe('"그가 ""안녕"" 했다"');
    expect(escapeCsvCell('첫 줄\n둘째 줄')).toBe('"첫 줄\n둘째 줄"');
  });

  it('엑셀 수식으로 실행될 수 있는 칸은 앞에 작은따옴표를 붙인다 (CSV 인젝션)', () => {
    expect(escapeCsvCell('=HYPERLINK("http://x")')).toBe(
      '"\'=HYPERLINK(""http://x"")"'
    );
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('isbnCell', () => {
  it('숫자 ISBN 은 엑셀이 지수로 바꾸지 않게 ="…" 로 감싼다', () => {
    expect(isbnCell('9788937460449')).toBe('"=""9788937460449"""');
    expect(isbnCell('893746044X')).toBe('"=""893746044X"""');
  });

  it('숫자가 아닌 값(직접 등록한 책 등)은 일반 칸처럼 다룬다', () => {
    expect(isbnCell('manual-abc')).toBe('manual-abc');
  });
});

describe('buildBooksCsv', () => {
  it('BOM 으로 시작하고 CRLF 로 줄을 나눈다', () => {
    const csv = buildBooksCsv([book()]);
    expect(csv.startsWith('﻿제목,저자,ISBN,상태,읽은 날짜,별점,한줄평')).toBe(
      true
    );
    expect(csv.split('\r\n')).toHaveLength(3); // 머리글 + 1권 + 끝 줄바꿈
  });

  it('연도만 남긴 책은 읽은 날짜에 연도를, 별점 0 은 빈칸을 쓴다', () => {
    const csv = buildBooksCsv([
      book({ completed_date: null, completed_year: 2023, rating: 0 }),
    ]);
    expect(csv.split('\r\n')[1]).toContain(',완독,2023,,');
  });

  it('등록일은 한국 날짜로 적는다 (UTC 15:30 → 다음 날)', () => {
    expect(buildBooksCsv([book()]).split('\r\n')[1]).toMatch(/,2024-03-06$/);
  });

  it('내보낸 파일을 가져오기로 다시 읽으면 같은 기록이 나온다 (왕복)', () => {
    const csv = buildBooksCsv([
      book({ one_line_review: '좋았다, 정말 "좋았다"' }),
      book({
        isbn: '9791190090018',
        title: '읽는 중인 책',
        status: 'reading',
        completed_date: null,
        rating: null,
        one_line_review: null,
      }),
      book({
        isbn: '9788934972464',
        title: '읽고 싶은 책',
        status: 'want_to_read',
        completed_date: null,
        completed_year: 2025,
        rating: 3,
      }),
    ]);

    const { rows } = parseImportText(csv);
    expect(rows.map(({ line: _line, ...rest }) => rest)).toEqual([
      {
        title: '데미안',
        author: '헤르만 헤세',
        isbn: '9788937460449',
        status: 'completed',
        completedDate: '2024-03-05',
        completedYear: null,
        rating: 5,
        review: '좋았다, 정말 "좋았다"',
      },
      {
        title: '읽는 중인 책',
        author: '헤르만 헤세',
        isbn: '9791190090018',
        status: 'reading',
        completedDate: null,
        completedYear: null,
        rating: null,
        review: null,
      },
      {
        title: '읽고 싶은 책',
        author: '헤르만 헤세',
        isbn: '9788934972464',
        status: 'want_to_read',
        completedDate: null,
        completedYear: 2025,
        rating: 3,
        review: '새는 알을 깨고 나온다',
      },
    ]);
  });
});
