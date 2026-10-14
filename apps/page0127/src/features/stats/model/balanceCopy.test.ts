import { describe, expect, it } from 'vitest';

import { calculateReadingBalance } from '@/entities/book';
import { createTestBook } from '@/entities/book/model/createTestBook';

import {
  categoryColor,
  getBalanceDelta,
  getBalanceLabel,
  getBalanceSummary,
  radarAxes,
} from './balanceCopy';

const books = (category: string, count: number) =>
  Array.from({ length: count }, () => createTestBook({ category }));

describe('balanceCopy', () => {
  it('점수 구간 문구는 진행형', () => {
    expect(getBalanceLabel(null)).toBe('책이 더 쌓이면 보여요');
    expect(getBalanceLabel(20)).toBe('한 우물을 깊이 파는 중');
    expect(getBalanceLabel(48)).toBe('조금씩 넓혀 가는 중');
    expect(getBalanceLabel(70)).toBe('고르게 읽는 중');
  });

  it('요약 — 읽은 분야 수와 상위 두 분야', () => {
    const balance = calculateReadingBalance([
      ...books('소설', 5),
      ...books('자기계발', 4),
      ...books('에세이', 2),
    ]);
    expect(getBalanceSummary(balance)).toBe(
      '9개 분야 중 3개를 읽었어요. 소설/시/희곡·자기계발이 82%'
    );
  });

  it('한 분야만이면 그 분야 이름만', () => {
    expect(getBalanceSummary(calculateReadingBalance(books('소설', 3)))).toBe(
      '9개 분야 중 1개를 읽었어요. 소설/시/희곡이 100%'
    );
  });

  it('받침 없는 분야로 끝나면 조사는 "가"', () => {
    expect(getBalanceSummary(calculateReadingBalance(books('에세이', 3)))).toBe(
      '9개 분야 중 1개를 읽었어요. 에세이가 100%'
    );
  });

  it('완독은 있는데 전부 분류 불명이면 그렇게 말한다', () => {
    expect(
      getBalanceSummary(calculateReadingBalance(books('국내도서>여행', 2)))
    ).toBe('분야 정보가 없는 책 2권은 아직 셀 수 없어요');
  });

  it('0권이면 시작 문구', () => {
    expect(getBalanceSummary(calculateReadingBalance([]))).toBe(
      '완독한 책이 쌓이면 분야가 채워져요'
    );
  });

  it('작년 대비 — 넓어짐 · 같음 · 좁아짐 · 비교 없음', () => {
    const now = calculateReadingBalance(
      [...books('소설', 2), ...books('에세이', 1)],
      books('소설', 2)
    );
    expect(getBalanceDelta(now)).toBe('작년보다 1개 분야 넓어졌어요 (+에세이)');
    const same = calculateReadingBalance(books('소설', 3), books('소설', 1));
    expect(getBalanceDelta(same)).toBe('작년과 같은 1개 분야를 읽고 있어요');
    const fewer = calculateReadingBalance(books('소설', 3), [
      ...books('소설', 1),
      ...books('에세이', 1),
    ]);
    expect(getBalanceDelta(fewer)).toBe('작년엔 2개 분야를 읽었어요');
    expect(
      getBalanceDelta(calculateReadingBalance(books('소설', 3)))
    ).toBeNull();
  });

  it('레이더 축 — 읽은 분야만, 많이 읽은 순으로 최대 8개', () => {
    const balance = calculateReadingBalance([
      ...books('소설', 5),
      ...books('자기계발', 4),
      ...books('에세이', 2),
      ...books('경제경영', 1),
    ]);
    expect(radarAxes(balance)).toEqual([
      { category: '소설/시/희곡', count: 5 },
      { category: '자기계발', count: 4 },
      { category: '에세이', count: 2 },
      { category: '경제/경영', count: 1 },
    ]);
  });

  it('레이더 축은 8개까지 — 9개를 다 읽어도 9번째는 뺀다', () => {
    const nine = [
      '컴퓨터/모바일',
      '소설/시/희곡',
      '인문학',
      '에세이',
      '경제/경영',
      '자기계발',
      '과학',
      '예술/대중문화',
      '역사',
    ].flatMap((category, i) => books(category, 9 - i));
    expect(radarAxes(calculateReadingBalance(nine))).toHaveLength(8);
  });

  it('읽은 분야가 3개 미만이면 레이더를 그리지 않는다(빈 배열) — 선 하나·점 하나는 모양이 아니다', () => {
    const two = calculateReadingBalance([
      ...books('소설', 3),
      ...books('에세이', 1),
    ]);
    expect(radarAxes(two)).toEqual([]);
  });

  it('분야 색은 순위대로 chart-1~7, 8위부터 chart-5', () => {
    expect(categoryColor(0)).toBe('var(--chart-1)');
    expect(categoryColor(6)).toBe('var(--chart-7)');
    expect(categoryColor(7)).toBe('var(--chart-5)');
  });
});
