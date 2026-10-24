import { describe, expect, it } from 'vitest';

import { READING_PERSONALITY_TYPES } from '@/entities/taste-analysis/model/personalityTypes';

import { toFirstImpression } from './firstImpression';

const NOVEL = '국내도서-소설/시/희곡';
const ESSAY = '국내도서-에세이';
const HUMANITIES = '국내도서-인문';
const SELF_HELP = '국내도서-자기계발';
const BUSINESS = '국내도서-경제경영';

const nameOf = (categories: (string | null)[]) =>
  toFirstImpression(categories)?.name ?? null;

describe('toFirstImpression', () => {
  it('3권 미만이면 첫인상이 없다 — 부제가 약속한 권수다', () => {
    expect(nameOf([])).toBeNull();
    expect(nameOf([NOVEL, NOVEL])).toBeNull();
  });

  it('가장 많이 고른 쪽의 성향을 고른다', () => {
    expect(nameOf([NOVEL, ESSAY, NOVEL])).toBe('이야기에 사는 사람');
    expect(nameOf([ESSAY, ESSAY, HUMANITIES])).toBe('마음의 결을 읽는 사람');
    expect(nameOf([HUMANITIES, '국내도서-역사', NOVEL])).toBe(
      '세상을 넓히는 사람'
    );
  });

  it('자기계발·경제경영은 같은 성향으로 묶어 센다', () => {
    expect(nameOf([SELF_HELP, BUSINESS, NOVEL])).toBe(
      '내일의 나를 준비하는 사람'
    );
  });

  it('동률이면 먼저 고른 책의 성향이 이긴다', () => {
    expect(nameOf([ESSAY, NOVEL, null])).toBe('마음의 결을 읽는 사람');
    expect(nameOf([NOVEL, ESSAY, null])).toBe('이야기에 사는 사람');
  });

  it('서로 다른 성향이 셋 이상 고르게 나오면 넓게 읽는 사람이다', () => {
    expect(nameOf([NOVEL, ESSAY, SELF_HELP])).toBe(
      '쉬지 않고 페이지를 넘기는 사람'
    );
    // 고르지 않으면(한쪽이 더 많으면) 그쪽이 이긴다
    expect(nameOf([NOVEL, ESSAY, SELF_HELP, NOVEL])).toBe('이야기에 사는 사람');
  });

  it('분류 불명(기타)은 세지 않고, 전부 불명이면 첫인상이 없다', () => {
    expect(nameOf([null, '', '국내도서'])).toBeNull();
    expect(nameOf([null, null, ESSAY])).toBe('마음의 결을 읽는 사람');
  });

  it('언제나 AI 취향 노트와 같은 카탈로그의 타입을 돌려준다', () => {
    const names = READING_PERSONALITY_TYPES.map((t) => t.name);
    const result = toFirstImpression([NOVEL, NOVEL, NOVEL]);
    expect(result && names.includes(result.name)).toBe(true);
    expect(result?.color).toMatch(/^#/);
  });
});
