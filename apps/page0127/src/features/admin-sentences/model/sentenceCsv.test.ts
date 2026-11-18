import { describe, expect, it } from 'vitest';

import {
  firstPageNumber,
  MAX_SENTENCE_IMPORT_ROWS,
  parseSentenceCsv,
  sentenceKey,
} from './sentenceCsv';

describe('parseSentenceCsv', () => {
  it('머리글 이름으로 열을 찾고, 모르는 열은 무시한다', () => {
    const csv = [
      '﻿no,category,text,book_title,author,translator,page,isbn,rights_note',
      '1,운,"걱정하지 마라, 아직 아무 일도 일어나지 않았다.",책 한 권,김작가,,P.29~30,9791190000000,출판사 공개 문구',
    ].join('\r\n');

    expect(parseSentenceCsv(csv)).toEqual({
      ok: true,
      errors: [],
      rows: [
        {
          text: '걱정하지 마라, 아직 아무 일도 일어나지 않았다.',
          book_title: '책 한 권',
          author: '김작가',
          translator: null,
          page: 29,
          isbn: '9791190000000',
          cover_image: null,
          rights_note: '출판사 공개 문구',
        },
      ],
    });
  });

  it('한국어 머리글과 탭(시트 붙여넣기)도 받는다', () => {
    const result = parseSentenceCsv(
      '문장\t책 제목\t쪽\n오늘이 가장 좋은 날\t책\t12쪽'
    );
    expect(result.ok && result.rows[0]).toMatchObject({
      text: '오늘이 가장 좋은 날',
      book_title: '책',
      page: 12,
    });
  });

  it('검사에 걸린 줄과 파일 안의 같은 문장은 빼고 이유를 알린다', () => {
    const long = '가'.repeat(301);
    const csv = [
      'text,book_title',
      `${long},책`,
      '좋은 문장,',
      '같은  문장,책',
      '같은 문장,책',
      '괜찮은 문장,책',
    ].join('\n');

    const result = parseSentenceCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map((r) => r.text)).toEqual([
      '같은  문장',
      '괜찮은 문장',
    ]);
    expect(result.errors).toEqual([
      { line: 2, message: '문장은 300자까지예요.' },
      { line: 3, message: '책 제목을 적어 주세요.' },
      { line: 5, message: '파일 안에 같은 문장이 또 있어요.' },
    ]);
  });

  it('필수 열이 없거나 줄이 너무 많으면 통째로 거절한다', () => {
    expect(parseSentenceCsv('text,author\n문장,저자')).toEqual({
      ok: false,
      message: '머리글에 text(문장)와 book_title(책 제목) 열이 있어야 해요.',
    });
    expect(parseSentenceCsv('text,book_title')).toMatchObject({ ok: false });

    const many = ['text,book_title'];
    for (let i = 0; i <= MAX_SENTENCE_IMPORT_ROWS; i += 1)
      many.push(`문장 ${i},책`);
    expect(parseSentenceCsv(many.join('\n'))).toMatchObject({ ok: false });
  });
});

describe('firstPageNumber', () => {
  it('첫 숫자만 쓰고, 숫자가 없으면 비운다', () => {
    expect(firstPageNumber('P.29~30')).toBe('29');
    expect(firstPageNumber('12쪽')).toBe('12');
    expect(firstPageNumber('')).toBe('');
    expect(firstPageNumber('서문')).toBe('');
  });
});

describe('sentenceKey', () => {
  it('띄어쓰기·줄바꿈 차이는 같은 문장으로 본다', () => {
    expect(sentenceKey(' 오늘도\n괜찮다  ')).toBe(sentenceKey('오늘도 괜찮다'));
  });
});
