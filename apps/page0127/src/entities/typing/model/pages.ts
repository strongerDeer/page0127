import {
  LITTLE_PRINCE_CHAPTERS,
  LITTLE_PRINCE_FAMOUS,
  LITTLE_PRINCE_SOURCE_LENGTHS,
} from '../content/littlePrince';

import type { TypingPassage, TypingPictureKey } from './types';

/** 필사 화면 한 장 — 전문의 한 쪽이거나 명문장 한 대목 */
export type TypingSheet = {
  /** typing_records.page_key 와 같다: '장-쪽'(0부터) 또는 'f:아이디' */
  key: string;
  kind: 'page' | 'famous';
  text: string;
  picture?: TypingPictureKey;
  /** 머리줄 "2장 3쪽" */
  title: string;
  /** 시계 칸 "3쪽 / 2장 총 13쪽" */
  counter: string;
  chapter: number | null;
};

export const pageKey = (chapter: number, index: number) =>
  `${chapter}-${index}`;
export const famousKey = (id: string) => `f:${id}`;

/** 번역이 끝난 전문 쪽 전부(1장 1쪽부터 차례로) */
export const FULL_SHEETS: TypingSheet[] = LITTLE_PRINCE_CHAPTERS.flatMap(
  (chapter) =>
    chapter.pages.map((page, index) => ({
      key: pageKey(chapter.no, index),
      kind: 'page' as const,
      text: page.text,
      picture: page.picture,
      title: `${chapter.no}장 ${index + 1}쪽`,
      counter: `${index + 1}쪽 / ${chapter.no}장 총 ${chapter.pages.length}쪽`,
      chapter: chapter.no,
    }))
);

export const famousSheet = (
  passage: TypingPassage,
  index: number
): TypingSheet => ({
  key: famousKey(passage.id),
  kind: 'famous',
  text: passage.text,
  title: `명문장 · ${passage.chapter} ${passage.label}`,
  counter: `${index + 1}쪽 / 총 ${LITTLE_PRINCE_FAMOUS.length}쪽`,
  chapter: null,
});

export const FAMOUS_SHEETS = LITTLE_PRINCE_FAMOUS.map(famousSheet);

export const OPEN_CHAPTERS = LITTLE_PRINCE_CHAPTERS.map((c) => c.no);

/**
 * 전체 분량 어림(글자 수).
 * 번역한 장은 실제 글자 수, 아직 안 한 장은 "번역한 장의 한국어/프랑스어 비율 × 원문 길이"로 어림한다.
 * 장이 추가될수록 저절로 정확해진다.
 */
export const estimateTotalChars = (): number => {
  const translated = FULL_SHEETS.reduce((sum, s) => sum + s.text.length, 0);
  const done = LITTLE_PRINCE_CHAPTERS.length;
  const sourceDone = LITTLE_PRINCE_SOURCE_LENGTHS.slice(0, done).reduce(
    (a, b) => a + b,
    0
  );
  const sourceRest = LITTLE_PRINCE_SOURCE_LENGTHS.slice(done).reduce(
    (a, b) => a + b,
    0
  );
  return Math.round(translated + (sourceRest * translated) / sourceDone);
};

export type TypingProgress = {
  /** 전체 필사 % (어림) */
  percent: number;
  doneChars: number;
  /** 장별 상태 — 'full' 다 씀, 'half' 쓰는 중, 'none' 안 씀, 'locked' 번역 전 */
  chapters: ('full' | 'half' | 'none' | 'locked')[];
  doneChapters: number;
};

/** 다 쓴 쪽 열쇠들로 진행도를 낸다 */
export const computeProgress = (doneKeys: ReadonlySet<string>): TypingProgress => {
  const doneChars = FULL_SHEETS.filter((s) => doneKeys.has(s.key)).reduce(
    (sum, s) => sum + s.text.length,
    0
  );
  const chapters = LITTLE_PRINCE_SOURCE_LENGTHS.map((_, i) => {
    const chapter = LITTLE_PRINCE_CHAPTERS.find((c) => c.no === i + 1);
    if (!chapter) return 'locked' as const;
    const done = chapter.pages.filter((_, p) =>
      doneKeys.has(pageKey(chapter.no, p))
    ).length;
    if (done === chapter.pages.length) return 'full' as const;
    return done > 0 ? ('half' as const) : ('none' as const);
  });
  return {
    percent: Math.min(100, Math.floor((doneChars / estimateTotalChars()) * 100)),
    doneChars,
    chapters,
    doneChapters: chapters.filter((c) => c === 'full').length,
  };
};

/** 전문 이어 쓰기 — 아직 안 쓴 첫 쪽(다 썼으면 처음) */
export const firstUnwrittenIndex = (
  doneKeys: ReadonlySet<string>,
  from = 0
): number => {
  const i = FULL_SHEETS.findIndex((s, idx) => idx >= from && !doneKeys.has(s.key));
  if (i >= 0) return i;
  const fromStart = FULL_SHEETS.findIndex((s) => !doneKeys.has(s.key));
  return fromStart >= 0 ? fromStart : 0;
};

/**
 * 원문을 화면 줄로 나눈다 — 옛 타자 프로그램처럼 "원문 한 줄 / 내가 친 한 줄" 쌍으로 보여 주려고.
 * 띄어쓰기에서 끊고, 한 단어가 너무 길면 그 자리에서 자른다.
 */
export const splitLines = (
  text: string,
  perLine: number
): { start: number; end: number }[] => {
  const lines: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + perLine, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > i) end = space + 1;
    }
    lines.push({ start: i, end });
    i = end;
  }
  return lines;
};
