import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { calculateReadingBalance } from '@/entities/book';
import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingBalanceCard } from './ReadingBalanceCard';

// 레이더는 recharts(브라우저 측정 필요)라 dynamic 으로 불린다 — 서버 렌더에서는 넘긴 축 수만 확인
vi.mock('next/dynamic', () => ({
  default:
    () =>
    ({ data }: { data: unknown[] }) => (
      <div data-testid='radar' data-axes={data.length} />
    ),
}));

const books = (category: string, count: number) =>
  Array.from({ length: count }, () => createTestBook({ category }));

const THREE = [
  ...books('소설', 5),
  ...books('자기계발', 4),
  ...books('에세이', 2),
];

describe('ReadingBalanceCard', () => {
  it('점수 · 띠 · 안 읽은 분야(텍스트)', () => {
    const balance = calculateReadingBalance(THREE);
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={balance} />
    );
    expect(html).toContain('2026 독서 균형');
    expect(html).toContain(`>${balance.score}<`);
    expect(html).toContain('조금씩 넓혀 가는 중');
    expect(html).toContain('아직 안 읽은 분야');
    expect(html).toContain('인문학 · 경제/경영');
    expect(html).not.toContain('기울');
  });

  it('레이더 축은 읽은 분야만 — 0권 분야는 축에 없다', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard
        year={2026}
        balance={calculateReadingBalance(THREE)}
      />
    );
    expect(html).toContain('data-axes="3"');
  });

  it('순위 막대 목록은 띠와 겹쳐서 뺀다 — 숫자는 띠 칸의 접근명·툴팁으로', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard
        year={2026}
        balance={calculateReadingBalance(THREE)}
      />
    );
    expect(html).not.toContain('<ul');
    expect(html).toContain('title="소설/시/희곡 5권 · 45%"');
  });

  it('읽은 분야가 3개 미만이면 레이더 없이 띠만', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard
        year={2026}
        balance={calculateReadingBalance([
          ...books('소설', 3),
          ...books('에세이', 1),
        ])}
      />
    );
    expect(html).not.toContain('data-testid="radar"');
  });

  it('완독 0권이면 점수·띠 없이 안내만', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={calculateReadingBalance([])} />
    );
    expect(html).toContain('완독한 책이 쌓이면 분야가 채워져요');
    expect(html).not.toContain('아직 안 읽은 분야');
  });
});
