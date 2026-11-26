import {
  LITTLE_PRINCE_CHAPTERS,
  LITTLE_PRINCE_FAMOUS,
  LITTLE_PRINCE_SOURCE_LENGTHS,
} from '../content/littlePrince';

import type { TypingPage, TypingPassage, TypingPictureKey } from './types';

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
/**
 * 쪽 묶기 — 원고는 약 240자씩 끊어 두었지만, 화면 줄이 넓어서(글자 폭으로 줄바꿈) 한 쪽이 두 줄이면 끝났다
 * (HJ 11/25 "장수가 너무 짧은거 아냐?"). 그래서 이어지는 쪽을 SHEET_TARGET 자 안에서 합친다.
 * 그림이 붙은 쪽은 그림이 쪽 끝에 와야 하므로 그 쪽에서 묶음을 닫는다.
 */
const SHEET_TARGET = 520;

const mergePages = (pages: TypingPage[]): TypingPage[] => {
  const out: TypingPage[] = [];
  let buf: TypingPage | null = null;
  for (const page of pages) {
    if (buf && buf.text.length + 1 + page.text.length <= SHEET_TARGET) {
      buf = { text: `${buf.text} ${page.text}`, picture: page.picture };
    } else {
      if (buf) out.push(buf);
      buf = { ...page };
    }
    if (buf.picture) {
      out.push(buf);
      buf = null;
    }
  }
  if (buf) out.push(buf);
  return out;
};

export const FULL_SHEETS: TypingSheet[] = LITTLE_PRINCE_CHAPTERS.flatMap(
  (chapter) => {
    const pages = mergePages(chapter.pages);
    return pages.map((page, index) => ({
      key: pageKey(chapter.no, index),
      kind: 'page' as const,
      text: page.text,
      picture: page.picture,
      title: `${chapter.no}장 ${index + 1}쪽`,
      counter: `${index + 1}쪽 / ${chapter.no}장 총 ${pages.length}쪽`,
      chapter: chapter.no,
    }));
  }
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
  /** 장별 다 쓴 쪽 수 / 전체 쪽 수 — 번역 전 장은 total 0 (HJ 2026-11-26 "한 쪽만 쳐서 다 쓴 건지 모르잖아") */
  chapterPages: { done: number; total: number }[];
  doneChapters: number;
};

/** 한 장의 다 쓴 쪽 / 전체 쪽 */
export const chapterPagesOf = (
  chapterNo: number,
  doneKeys: ReadonlySet<string>
): { done: number; total: number } => {
  const sheets = FULL_SHEETS.filter((s) => s.chapter === chapterNo);
  return {
    done: sheets.filter((s) => doneKeys.has(s.key)).length,
    total: sheets.length,
  };
};

/** 다 쓴 쪽 열쇠들로 진행도를 낸다 */
export const computeProgress = (
  doneKeys: ReadonlySet<string>
): TypingProgress => {
  const doneChars = FULL_SHEETS.filter((s) => doneKeys.has(s.key)).reduce(
    (sum, s) => sum + s.text.length,
    0
  );
  // 묶은 뒤의 쪽(FULL_SHEETS) 기준으로 센다
  const chapterPages = LITTLE_PRINCE_SOURCE_LENGTHS.map((_, i) =>
    chapterPagesOf(i + 1, doneKeys)
  );
  const chapters = chapterPages.map(({ done, total }) => {
    if (total === 0) return 'locked' as const;
    if (done === total) return 'full' as const;
    return done > 0 ? ('half' as const) : ('none' as const);
  });
  return {
    percent: Math.min(
      100,
      Math.floor((doneChars / estimateTotalChars()) * 100)
    ),
    doneChars,
    chapters,
    chapterPages,
    doneChapters: chapters.filter((c) => c === 'full').length,
  };
};

/** 전문 이어 쓰기 — 아직 안 쓴 첫 쪽(다 썼으면 처음) */
export const firstUnwrittenIndex = (
  doneKeys: ReadonlySet<string>,
  from = 0
): number => {
  const i = FULL_SHEETS.findIndex(
    (s, idx) => idx >= from && !doneKeys.has(s.key)
  );
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

/**
 * 실제 글자 폭으로 줄을 나눈다 — fits(줄) 이 true 인 동안 낱말 단위로 늘린다.
 * 띄어쓰기에서 끊고, 공백은 앞 줄 끝에 붙인다(splitLines 와 같은 모양). 한 낱말이 한 줄보다 길면 글자 단위로 자른다.
 */
export const splitLinesToFit = (
  text: string,
  fits: (line: string) => boolean
): { start: number; end: number }[] => {
  const lines: { start: number; end: number }[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i;
    // 낱말(공백 포함) 단위로 붙여 본다
    while (end < text.length) {
      const space = text.indexOf(' ', end);
      const next = space === -1 ? text.length : space + 1;
      // 줄 끝 공백은 폭에 넣지 않는다
      if (!fits(text.slice(i, next).trimEnd())) break;
      end = next;
    }
    if (end === i) {
      // 낱말 하나가 너무 길다 → 들어가는 만큼만 글자로 자른다
      end = i + 1;
      while (end < text.length && fits(text.slice(i, end + 1))) end++;
    }
    lines.push({ start: i, end });
    i = end;
  }
  return lines;
};
