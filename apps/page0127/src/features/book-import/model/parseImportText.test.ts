import { describe, expect, it } from 'vitest';

import { MAX_IMPORT_ROWS } from './limits';
import {
  parseImportText,
  parseRating,
  parseReadDate,
  parseStatus,
  splitTable,
} from './parseImportText';

describe('parseImportText', () => {
  it('엑셀에서 붙여넣은 표(탭)를 머리글 이름으로 읽는다 — 열 순서는 상관없다', () => {
    const text = [
      '별점\t저자\t제목\t읽은 날짜\t한줄평',
      '5\t한스 로슬링\t팩트풀니스\t2024-03-05\t세상을 다시 봤다',
    ].join('\n');

    expect(parseImportText(text).rows).toEqual([
      {
        line: 2,
        title: '팩트풀니스',
        author: '한스 로슬링',
        isbn: null,
        status: null,
        completedDate: '2024-03-05',
        completedYear: null,
        rating: 5,
        review: '세상을 다시 봤다',
      },
    ]);
  });

  it('CSV 따옴표 안의 쉼표·줄바꿈은 칸의 일부다', () => {
    const text = '제목,저자\n"총, 균, 쇠",재레드 다이아몬드\n"여러\n줄",누구';
    const { rows } = parseImportText(text);
    expect(rows.map((r) => r.title)).toEqual(['총, 균, 쇠', '여러\n줄']);
    expect(rows[0].author).toBe('재레드 다이아몬드');
  });

  it('Goodreads 내보내기 — ="..." 로 감싼 ISBN 과 Exclusive Shelf 를 읽는다', () => {
    const text = [
      'Book Id,Title,Author,ISBN,ISBN13,My Rating,Date Read,Exclusive Shelf',
      '1,Sapiens,Yuval Noah Harari,="0062316095",="9780062316097",4,2023/01/15,read',
      '2,Dune,Frank Herbert,="",="",0,,to-read',
    ].join('\n');

    const { rows } = parseImportText(text);
    // ISBN 열이 먼저 나오므로 ISBN10 을 13자리로 바꿔 쓴다
    expect(rows[0]).toMatchObject({
      title: 'Sapiens',
      isbn: '9780062316097',
      rating: 4,
      completedDate: '2023-01-15',
      status: 'completed',
    });
    expect(rows[1]).toMatchObject({
      isbn: null,
      rating: null,
      status: 'want_to_read',
    });
  });

  it('머리글이 없으면 한 줄에 제목 하나(+저자)로 본다', () => {
    const { rows } = parseImportText('데미안\t헤르만 헤세\n\n채식주의자\n');
    expect(rows.map((r) => [r.line, r.title, r.author])).toEqual([
      [1, '데미안', '헤르만 헤세'],
      [2, '채식주의자', null],
    ]);
  });

  it('머리글 없이 ISBN 만 적은 줄도 받는다 (체크 숫자가 맞을 때만)', () => {
    const { rows } = parseImportText('978-89-364-3412-0\n9788936434121');
    expect(rows[0]).toMatchObject({ isbn: '9788936434120', title: '' });
    // 체크 숫자가 틀리면 ISBN 이 아니라 제목으로 본다
    expect(rows[1]).toMatchObject({ isbn: null, title: '9788936434121' });
  });

  it('엑셀 UTF-8 CSV 의 BOM 을 떼고 머리글을 알아본다', () => {
    const { rows } = parseImportText('﻿제목\n코스모스');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('코스모스');
  });

  it('제목·ISBN 이 둘 다 빈 줄은 버린다', () => {
    const { rows } = parseImportText(
      '제목\t저자\n\t누군가\n코스모스\t칼 세이건'
    );
    expect(rows.map((r) => r.title)).toEqual(['코스모스']);
  });

  it(`${MAX_IMPORT_ROWS}권을 넘으면 잘라 내고 몇 권 잘렸는지 알려 준다`, () => {
    const text = Array.from(
      { length: MAX_IMPORT_ROWS + 3 },
      (_, i) => `책 ${i}`
    ).join('\n');
    const result = parseImportText(text);
    expect(result.rows).toHaveLength(MAX_IMPORT_ROWS);
    expect(result.truncated).toBe(3);
  });

  it('한줄평은 300자에서 자른다 (DB 제약)', () => {
    const { rows } = parseImportText(`제목\t한줄평\n책\t${'가'.repeat(400)}`);
    expect(rows[0].review).toHaveLength(300);
  });
});

describe('splitTable', () => {
  it('"" 는 따옴표 한 개이고, 칸 중간의 따옴표는 글자다', () => {
    expect(splitTable('"그가 ""안녕""이라 했다",5\n12" 피자,3', ',')).toEqual([
      ['그가 "안녕"이라 했다', '5'],
      ['12" 피자', '3'],
    ]);
  });

  it('\\r\\n 줄바꿈도 한 줄로 센다', () => {
    expect(splitTable('a,b\r\nc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseReadDate', () => {
  it.each([
    ['2024-03-05', '2024-03-05'],
    ['2024.3.5', '2024-03-05'],
    ['2024. 3. 5.', '2024-03-05'],
    ['2024/03/05', '2024-03-05'],
    ['2024년 3월 5일', '2024-03-05'],
  ])('%s → 날짜 %s', (input, date) => {
    expect(parseReadDate(input)).toEqual({ date, year: null });
  });

  it.each(['2024', '2024년', '2024.07', '2024년 7월'])(
    '%s → 연도만',
    (input) => {
      expect(parseReadDate(input)).toEqual({ date: null, year: 2024 });
    }
  );

  it.each(['2024-02-31', '2024-13-01', '어제', '1850-01-01', ''])(
    '%s 는 읽지 않는다',
    (input) => {
      expect(parseReadDate(input)).toEqual({ date: null, year: null });
    }
  );
});

describe('parseRating', () => {
  it.each([
    ['4', 4],
    ['4.5', 5],
    ['3.4', 3],
    ['★★★★☆', 4],
    ['4/5', 4],
    ['8/10', 4],
    ['9', 5],
  ])('%s → %s', (input, rating) => {
    expect(parseRating(input)).toBe(rating);
  });

  it.each(['0', '', '별로', '11', '-1'])('%s → 안 매김', (input) => {
    expect(parseRating(input)).toBeNull();
  });
});

describe('parseStatus', () => {
  it.each([
    ['완독', 'completed'],
    ['read', 'completed'],
    ['읽는 중', 'reading'],
    ['currently-reading', 'reading'],
    ['읽고 싶은 책', 'want_to_read'],
    ['to-read', 'want_to_read'],
    ['', null],
    ['포기', null],
  ])('%s → %s', (input, status) => {
    expect(parseStatus(input)).toBe(status);
  });
});
