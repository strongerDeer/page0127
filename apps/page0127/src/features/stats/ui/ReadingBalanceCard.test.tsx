import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { calculateReadingBalance } from '@/entities/book';
import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingBalanceCard } from './ReadingBalanceCard';

// 레이더는 recharts(브라우저 측정 필요)라 dynamic 으로 불린다 — 서버 렌더에서는 자리만 확인
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid='radar' />,
}));

const books = (category: string, count: number) =>
  Array.from({ length: count }, () => createTestBook({ category }));

describe('ReadingBalanceCard', () => {
  it('점수 · 띠 · 순위 · 0권 분야', () => {
    const balance = calculateReadingBalance([
      ...books('소설', 5),
      ...books('자기계발', 4),
      ...books('에세이', 2),
    ]);
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={balance} />
    );
    expect(html).toContain('2026 독서 균형');
    expect(html).toContain('data-testid="radar"');
    expect(html).toContain(`>${balance.score}<`);
    expect(html).toContain('조금씩 넓혀 가는 중');
    expect(html).toContain('아직 0권');
    expect(html).toContain('인문학');
    expect(html).not.toContain('기울');
  });

  it('완독 0권이면 점수·띠 없이 안내만', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={calculateReadingBalance([])} />
    );
    expect(html).toContain('완독한 책이 쌓이면 분야가 채워져요');
    expect(html).not.toContain('아직 0권');
  });
});
