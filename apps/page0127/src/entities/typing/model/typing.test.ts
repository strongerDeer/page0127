import { describe, expect, it } from 'vitest';

import {
  LITTLE_PRINCE_CHAPTERS,
  LITTLE_PRINCE_FAMOUS,
} from '../content/littlePrince';
import {
  computeProgress,
  FAMOUS_SHEETS,
  firstUnwrittenIndex,
  FULL_SHEETS,
  splitLines,
  splitLinesToFit,
} from './pages';
import { judgeTyping, strokesOf, strokesPerMinute } from './strokes';

describe('strokesOf — 한글 자판 타수', () => {
  it('받침 없는 글자는 2타, 받침 있으면 3타', () => {
    expect(strokesOf('가')).toBe(2);
    expect(strokesOf('각')).toBe(3);
  });
  it('쌍자음 초성은 1타로 센다', () => {
    expect(strokesOf('까')).toBe(2);
  });
  it('이중모음(ㅘ)과 겹받침(ㄺ)은 2타', () => {
    expect(strokesOf('과')).toBe(3);
    expect(strokesOf('닭')).toBe(4);
  });
  it('공백·문장부호는 1타', () => {
    expect(strokesOf(' ')).toBe(1);
    expect(strokesOf('.')).toBe(1);
  });
});

describe('judgeTyping', () => {
  it('조합 중인 마지막 글자는 판정하지 않는다', () => {
    const j = judgeTyping('여ㅇ', '여우', true);
    expect(j.settled).toBe(1);
    expect(j.wrong).toEqual([]);
  });
  it('틀린 위치를 모은다', () => {
    const j = judgeTyping('여오', '여우', false);
    expect(j.wrong).toEqual([1]);
    expect(j.correctStrokes).toBe(strokesOf('여'));
  });
  it('3초 전에는 타수를 0으로 둔다', () => {
    expect(strokesPerMinute(30, 2000)).toBe(0);
    expect(strokesPerMinute(300, 60_000)).toBe(300);
  });
});

describe('본문 데이터', () => {
  it('쪽 열쇠는 DB CHECK 모양과 같고 겹치지 않는다', () => {
    const shape = /^([0-9]{1,2}-[0-9]{1,3}|f:[a-z0-9-]{1,40})$/;
    const keys = [...FULL_SHEETS, ...FAMOUS_SHEETS].map((s) => s.key);
    keys.forEach((k) => expect(k).toMatch(shape));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('한 쪽은 DB 상한(2000자) 안이고 비어 있지 않다', () => {
    [...FULL_SHEETS, ...FAMOUS_SHEETS].forEach((s) => {
      expect(s.text.length).toBeGreaterThan(0);
      expect(s.text.length).toBeLessThanOrEqual(2000);
    });
  });
  it('치기 어려운 글자(둥근 따옴표·말줄임 기호·줄바꿈)를 쓰지 않는다', () => {
    [...FULL_SHEETS, ...FAMOUS_SHEETS].forEach((s) =>
      expect(s.text).not.toMatch(/[“”‘’…\n]/)
    );
  });
  it('장 번호는 1부터 빈틈없이 이어진다', () => {
    LITTLE_PRINCE_CHAPTERS.forEach((c, i) => expect(c.no).toBe(i + 1));
    expect(LITTLE_PRINCE_FAMOUS.length).toBeGreaterThan(0);
  });
});

describe('진행도', () => {
  it('아무것도 안 썼으면 0%, 번역 전 장은 잠김', () => {
    const p = computeProgress(new Set());
    expect(p.percent).toBe(0);
    expect(p.chapters).toHaveLength(27);
    expect(p.chapters[26]).toBe('locked');
  });
  it('1장을 다 쓰면 1장이 full, 2장 한 쪽만 쓰면 half', () => {
    const keys = new Set(
      FULL_SHEETS.filter((s) => s.chapter === 1).map((s) => s.key)
    );
    keys.add('2-0');
    const p = computeProgress(keys);
    expect(p.chapters[0]).toBe('full');
    expect(p.chapters[1]).toBe('half');
    expect(p.doneChapters).toBe(1);
    expect(p.percent).toBeGreaterThan(0);
  });
  it('이어 쓰기는 안 쓴 첫 쪽으로, 다 썼으면 처음으로', () => {
    expect(firstUnwrittenIndex(new Set(['1-0']))).toBe(1);
    const all = new Set(FULL_SHEETS.map((s) => s.key));
    expect(firstUnwrittenIndex(all)).toBe(0);
  });
});

describe('splitLines', () => {
  it('띄어쓰기에서 끊고, 원문을 빠짐없이 덮는다', () => {
    const text = '어른들은 숫자를 좋아한다. 새 친구 이야기를 하면';
    const lines = splitLines(text, 10);
    expect(lines[0].start).toBe(0);
    expect(lines.at(-1)?.end).toBe(text.length);
    lines.slice(0, -1).forEach((l) => expect(text[l.end - 1]).toBe(' '));
  });
});

describe('splitLinesToFit', () => {
  const text = '어른들은 숫자를 좋아한다. 새 친구 이야기를 하면';
  it('들어가는 만큼 낱말 단위로 채우고, 원문을 빠짐없이 덮는다', () => {
    const lines = splitLinesToFit(text, (l) => l.length <= 12);
    expect(lines[0].start).toBe(0);
    expect(lines.at(-1)?.end).toBe(text.length);
    lines.forEach((l) =>
      expect(text.slice(l.start, l.end).trimEnd().length).toBeLessThanOrEqual(
        12
      )
    );
    lines.slice(0, -1).forEach((l) => expect(text[l.end - 1]).toBe(' '));
  });
  it('한 낱말이 줄보다 길면 글자 단위로 자른다', () => {
    const lines = splitLinesToFit('가나다라마바사', (l) => l.length <= 3);
    expect(lines.map((l) => l.end - l.start)).toEqual([3, 3, 1]);
  });
});

describe('본문 — 키보드로 칠 수 있는 글자만', () => {
  // 한글 완성형 + 키보드에 있는 ASCII(공백·영문·숫자·" ' . , ? ! ( ) - 등)만 허용한다.
  // 「」 “” … — 같은 문자는 자판으로 칠 수 없어 필사가 막힌다.
  const TYPABLE = /^[가-힣\x20-\x7E]*$/;
  const texts = [
    ...FULL_SHEETS.map((s) => s.text),
    ...FAMOUS_SHEETS.map((s) => s.text),
  ];

  it.each(texts.map((t) => [t.slice(0, 20), t]))('%s…', (_, text) => {
    const bad = [...text].filter((ch) => !TYPABLE.test(ch));
    expect(bad).toEqual([]);
  });
});
