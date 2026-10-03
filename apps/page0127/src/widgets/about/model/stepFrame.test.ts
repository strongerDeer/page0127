import { describe, expect, it } from 'vitest';

import { BOOKS_AT, nextStep, pickSpines, stepFrame } from './stepFrame';

import type { ShelfBook } from './coverRows';

describe('stepFrame', () => {
  it('1단계 시작: 책 1권, 별 0, 메모 0', () => {
    expect(stepFrame(0, 0)).toEqual({
      books: 1,
      stars: 0,
      memoRatio: 0,
      goalRatio: 0,
    });
  });

  it('1단계 끝: 별 4개, 메모 전부', () => {
    const f = stepFrame(0, 1);
    expect(f.stars).toBe(4);
    expect(f.memoRatio).toBe(1);
  });

  it('2단계: 책이 1권에서 7권으로 자라고 목표가 찬다', () => {
    expect(stepFrame(1, 0).books).toBe(BOOKS_AT[0]);
    expect(stepFrame(1, 1)).toMatchObject({ books: BOOKS_AT[1], goalRatio: 1 });
  });

  it('3단계: 12권, 앞 단계 결과는 완성 상태로 유지', () => {
    expect(stepFrame(2, 1)).toEqual({
      books: 12,
      stars: 4,
      memoRatio: 1,
      goalRatio: 1,
    });
  });

  it('진행도 범위를 벗어나도 깨지지 않는다', () => {
    expect(stepFrame(0, -1).books).toBe(1);
    expect(stepFrame(2, 5).books).toBe(12);
  });

  it('단계 연출은 진행도 절반 안에 끝난다 — 완성된 모습이 머물 시간을 남긴다', () => {
    expect(stepFrame(1, 0.5).goalRatio).toBe(1);
  });
});

describe('nextStep', () => {
  it('3단계 다음은 1단계', () => {
    expect(nextStep(2)).toBe(0);
  });
});

describe('pickSpines', () => {
  const b = (i: number, spine: string | null): ShelfBook => ({
    id: `b${i}`,
    title: `책${i}`,
    coverImage: null,
    spineImage: spine,
  });

  it('책등 이미지가 있는 책을 먼저 고른다', () => {
    const spines = pickSpines([b(1, null), b(2, 's2'), b(3, 's3')], 2);
    expect(spines.map((s) => s.src)).toEqual(['s2', 's3']);
  });

  it('모자라면 이미지 없는 칸(src null)으로 채운다 — 빈 자리를 남기지 않는다', () => {
    const spines = pickSpines([b(1, 's1')], 3);
    expect(spines).toHaveLength(3);
    expect(spines.map((s) => s.src)).toEqual(['s1', null, null]);
  });
});
