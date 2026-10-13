import { describe, expect, it } from 'vitest';

import { createTestBook } from './createTestBook';
import { BALANCE_CATEGORIES, calculateReadingBalance } from './readingBalance';

const books = (category: string, count: number) =>
  Array.from({ length: count }, () =>
    createTestBook({ category, completed_date: '2026-05-01' })
  );

// 소설5 · 자기계발4 · 에세이2 · 경제2 · 컴퓨터1 = 14권
const SAMPLE = [
  ...books('국내도서>소설/시/희곡>한국소설', 5),
  ...books('국내도서>자기계발>성공', 4),
  ...books('국내도서>에세이', 2),
  ...books('국내도서>경제경영>마케팅', 2),
  ...books('국내도서>컴퓨터/모바일>프로그래밍', 1),
];

describe('calculateReadingBalance', () => {
  it('기타를 뺀 9개 분야를 고정 순서로 센다 (레이더 축)', () => {
    const balance = calculateReadingBalance(SAMPLE);
    expect(BALANCE_CATEGORIES).toHaveLength(9);
    expect(balance.categories.map((c) => c.category)).toEqual([
      ...BALANCE_CATEGORIES,
    ]);
    expect(balance.total).toBe(14);
    expect(balance.readCount).toBe(5);
  });

  it('많이 읽은 순 · 상위 2개 비율 · 0권 분야', () => {
    const balance = calculateReadingBalance(SAMPLE);
    expect(balance.ranked.map((r) => [r.category, r.count])).toEqual([
      ['소설/시/희곡', 5],
      ['자기계발', 4],
      ['에세이', 2],
      ['경제/경영', 2],
      ['컴퓨터/모바일', 1],
    ]);
    expect(balance.ranked[0].share).toBe(36);
    expect(balance.topShare).toBe(64);
    expect(balance.zero).toEqual(['인문학', '과학', '예술/대중문화', '역사']);
  });

  it('고른 정도 = 정규화 엔트로피 × 100', () => {
    expect(calculateReadingBalance(SAMPLE).score).toBe(67);
  });

  it('9개 분야를 한 권씩이면 100, 한 분야만이면 0', () => {
    // '인문학' 문자열은 매퍼가 '문학'에 먼저 걸어 소설로 분류한다(기존 매퍼 동작) →
    // 인문학 대표로 '철학' 경로를 쓴다
    const even = [
      '컴퓨터/모바일',
      '소설/시/희곡',
      '국내도서>철학',
      '에세이',
      '경제/경영',
      '자기계발',
      '과학',
      '예술/대중문화',
      '역사',
    ].map((category) => createTestBook({ category }));
    expect(calculateReadingBalance(even).score).toBe(100);
    expect(calculateReadingBalance(books('소설', 5)).score).toBe(0);
  });

  it('3권 미만이면 점수를 내지 않는다', () => {
    expect(calculateReadingBalance(books('소설', 2)).score).toBeNull();
  });

  it('기타(분류 불명)와 완독이 아닌 책은 세지 않는다', () => {
    const balance = calculateReadingBalance([
      createTestBook({ category: null }),
      createTestBook({ category: '국내도서>여행' }),
      createTestBook({ category: '소설', status: 'reading' }),
      ...books('소설', 3),
    ]);
    expect(balance.total).toBe(3);
    // 분류 불명 완독은 따로 센다 — "0권"과 "분야를 모르는 책"은 다른 말이다
    expect(balance.unclassified).toBe(2);
  });

  it('작년 대비 — 분야 수 증감과 새로 읽은 분야', () => {
    const prev = [
      ...books('소설', 3),
      ...books('자기계발', 1),
      ...books('경제경영', 1),
      ...books('컴퓨터/모바일', 1),
    ];
    expect(calculateReadingBalance(SAMPLE, prev).prev).toEqual({
      readCountDelta: 1,
      newCategories: ['에세이'],
    });
  });

  it('작년 기록이 없으면 비교하지 않는다', () => {
    expect(calculateReadingBalance(SAMPLE, []).prev).toBeNull();
  });
});
