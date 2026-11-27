import { describe, expect, it } from 'vitest';

import { toCheerLine } from './cheerLine';
import { CHEER_YEAR, isCheerSeason } from './season';
import {
  CHEER_SENTENCES,
  findCheerSentence,
  pickCheerSentence,
} from './sentences';

describe('응원 문장 목록', () => {
  it('id 는 DB CHECK(^[a-z0-9-]{1,40}$)에 맞고 겹치지 않는다', () => {
    const ids = CHEER_SENTENCES.map((s) => s.id);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('줄·작가·작품이 비어 있지 않다', () => {
    for (const s of CHEER_SENTENCES) {
      expect(s.lines.length).toBeGreaterThan(0);
      for (const line of s.lines) expect(line.trim()).not.toBe('');
      expect(s.author.trim()).not.toBe('');
      expect(s.work.trim()).not.toBe('');
    }
  });

  it('id 로 찾고, 없는 id 는 undefined', () => {
    expect(findCheerSentence('yun-new-road')?.author).toBe('윤동주');
    expect(findCheerSentence('nope')).toBeUndefined();
  });

  it('무작위 값 0 이상 1 미만이 늘 목록 안의 문장을 고른다', () => {
    expect(pickCheerSentence(() => 0)).toBe(CHEER_SENTENCES[0]);
    expect(pickCheerSentence(() => 0.999999)).toBe(
      CHEER_SENTENCES[CHEER_SENTENCES.length - 1]
    );
    // 혹시 1 이 와도 목록 밖으로 나가지 않는다
    expect(pickCheerSentence(() => 1)).toBe(
      CHEER_SENTENCES[CHEER_SENTENCES.length - 1]
    );
  });
});

describe('첫 줄 (올해 끝까지 읽은 책 수)', () => {
  it.each([
    [0, '수고 많았어요'],
    [1, '1권과 함께'],
    [5, '5권과 함께'],
    [6, '6권, 계절마다'],
    [20, '20권, 계절마다'],
    [21, '21권, 책장이 부쩍'],
    [50, '50권, 책장이 부쩍'],
    [51, '51권, 책장이 한 칸 더'],
  ])('%i권 → "%s"', (books, expected) => {
    expect(toCheerLine(books)).toContain(expected);
  });

  it('음수·소수는 0 이상 정수로 다룬다', () => {
    expect(toCheerLine(-3)).toBe(toCheerLine(0));
    expect(toCheerLine(3.7)).toContain('3권');
  });
});

describe('입구 카드 기간', () => {
  it('12월 1일~31일만', () => {
    expect(isCheerSeason(`${CHEER_YEAR}-11-30`)).toBe(false);
    expect(isCheerSeason(`${CHEER_YEAR}-12-01`)).toBe(true);
    expect(isCheerSeason(`${CHEER_YEAR}-12-31`)).toBe(true);
    expect(isCheerSeason(`${CHEER_YEAR + 1}-01-01`)).toBe(false);
  });
});
