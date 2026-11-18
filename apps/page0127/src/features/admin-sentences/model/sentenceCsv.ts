import { splitTable } from '@/features/book-import/model/parseImportText';

import { parseSentenceForm } from './sentenceForm';

import type { SentenceValues } from './sentenceForm';

/**
 * 어드민 "CSV 올리기" — 문장 여러 개를 한 번에 풀에 넣는다 (HJ, 2026-11-18).
 *
 * 왜 따로 검사하지 않고 parseSentenceForm 을 다시 쓰나:
 *   하나씩 넣을 때와 한 번에 넣을 때 규칙(300자, 쪽수 범위, 표지 주소)이 달라지면
 *   CSV 로만 들어온 이상한 문장이 생긴다. 줄마다 FormData 를 만들어 같은 검사기를 통과시킨다.
 *
 * 받는 모양: 첫 줄이 머리글인 CSV(쉼표) 또는 시트에서 복사한 표(탭).
 * 머리글은 이름으로 찾는다 — 열 순서가 달라도, 모르는 열(분류 등)이 섞여 있어도 된다.
 */

/** 한 번에 받는 최대 줄 수 — 서버 액션 요청 크기(기본 1MB) 안에 넉넉히 들어온다 */
export const MAX_SENTENCE_IMPORT_ROWS = 300;

type Field = keyof SentenceValues;

/** 공백·밑줄을 걷고 소문자로 비교한다 ("book_title" = "booktitle" = "책 제목") */
const HEADER_ALIASES: Record<Field, string[]> = {
  text: ['text', '문장', '본문'],
  book_title: ['booktitle', 'title', '책제목', '제목', '도서명'],
  author: ['author', '저자', '지은이'],
  translator: ['translator', '옮긴이', '번역', '역자'],
  page: ['page', '쪽', '쪽수', '페이지'],
  isbn: ['isbn', 'isbn13'],
  cover_image: ['coverimage', 'cover', '표지'],
  rights_note: ['rightsnote', '권리', '권리메모', '저작권'],
};

const normalizeHeader = (cell: string) =>
  cell
    .replace(/^﻿/, '')
    .toLowerCase()
    .replace(/[\s_\-()[\]]/g, '');

/**
 * 쪽수는 숫자만 받는다(DB integer). 서점 "책 속에서" 문구는 "P.29~30", "29쪽" 처럼
 * 적혀 오므로 첫 숫자만 쓴다. 숫자가 없으면 비운다.
 */
export const firstPageNumber = (cell: string): string =>
  cell.match(/\d+/)?.[0] ?? '';

/** 같은 문장인지 비교할 때 — 띄어쓰기·줄바꿈 차이는 같은 문장으로 본다 */
export const sentenceKey = (text: string): string =>
  text.replace(/\s+/g, ' ').trim();

export type SentenceCsvError = { line: number; message: string };

export type SentenceCsvResult =
  | {
      ok: true;
      rows: SentenceValues[];
      /** 못 넣는 줄 — 줄 번호는 파일 기준(머리글이 1번) */
      errors: SentenceCsvError[];
    }
  | { ok: false; message: string };

export const parseSentenceCsv = (input: string): SentenceCsvResult => {
  const text = input.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const table = splitTable(text, firstLine.includes('\t') ? '\t' : ',');
  const [header, ...body] = table;
  if (!header || body.length === 0)
    return { ok: false, message: '머리글과 문장이 한 줄 이상 있어야 해요.' };

  const columns: Partial<Record<Field, number>> = {};
  header.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      Field,
      string[],
    ][]) {
      if (columns[field] === undefined && aliases.includes(key))
        columns[field] = index;
    }
  });
  if (columns.text === undefined || columns.book_title === undefined)
    return {
      ok: false,
      message: '머리글에 text(문장)와 book_title(책 제목) 열이 있어야 해요.',
    };
  if (body.length > MAX_SENTENCE_IMPORT_ROWS)
    return {
      ok: false,
      message: `한 번에 ${MAX_SENTENCE_IMPORT_ROWS}줄까지 올릴 수 있어요.`,
    };

  const rows: SentenceValues[] = [];
  const errors: SentenceCsvError[] = [];
  const seen = new Set<string>();

  body.forEach((cells, index) => {
    // splitTable 이 빈 줄을 걸러서 실제 줄 번호와 어긋날 수 있다 — 표의 몇 번째 줄인지로 알린다
    const line = index + 2;
    const form = new FormData();
    for (const [field, column] of Object.entries(columns) as [
      Field,
      number,
    ][]) {
      const cell = cells[column] ?? '';
      form.set(field, field === 'page' ? firstPageNumber(cell) : cell);
    }

    const parsed = parseSentenceForm(form);
    if (!parsed.ok) {
      errors.push({ line, message: parsed.message });
      return;
    }
    const key = sentenceKey(parsed.value.text);
    if (seen.has(key)) {
      errors.push({ line, message: '파일 안에 같은 문장이 또 있어요.' });
      return;
    }
    seen.add(key);
    rows.push(parsed.value);
  });

  return { ok: true, rows, errors };
};
