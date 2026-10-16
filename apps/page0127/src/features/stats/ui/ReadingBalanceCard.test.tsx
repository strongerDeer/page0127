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

  it('연도 없이 쓰면(전체 탭) "지금까지 독서 균형" — 작년 대비 문장은 없다', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard balance={calculateReadingBalance(THREE)} />
    );
    expect(html).toContain('지금까지 독서 균형');
    expect(html).not.toContain('작년');
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

  it('띠 칸 폭은 권수 비율(flex-grow) — 반올림한 %를 더하면 100%가 안 돼 오른쪽 끝이 비고 둥글지 않았다', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard
        year={2026}
        balance={calculateReadingBalance(THREE)}
      />
    );
    expect(html).toMatch(/title="소설\/시\/희곡[^"]*"[^>]*flex-grow:5/);
    expect(html).not.toMatch(/width:\d+%/);
  });

  it('좁은 칸(25% 미만)의 이름은 모바일에서 숨긴다 — 칸끼리 글자가 붙었다(컴퓨터 2인문학 2)', () => {
    // 6 · 5 · 2 권 → 46% · 38% · 15%
    const balance = calculateReadingBalance([
      ...books('소설', 6),
      ...books('자기계발', 5),
      ...books('에세이', 2),
    ]);
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={balance} />
    );
    expect(html).toMatch(/<span class="[^"]*hidden sm:inline[^"]*">에세이 2</);
    expect(html).not.toMatch(
      /<span class="[^"]*hidden sm:inline[^"]*">소설 6</
    );
  });

  it('25% 미만도 모바일에선 숨긴다 — 운영 21% 칸이 "자기계…"로 잘렸다(375px 띠 277px × 21% ≈ 58px)', () => {
    // 3 · 3 · 3 · 2 · 2 · 1 권(14권) → 21%(3권) 칸
    const balance = calculateReadingBalance([
      ...books('소설', 3),
      ...books('에세이', 3),
      ...books('자기계발', 3),
      ...books('컴퓨터', 2),
      ...books('인문학', 2),
      ...books('경제경영', 1),
    ]);
    const html = renderToStaticMarkup(
      <ReadingBalanceCard year={2026} balance={balance} />
    );
    expect(html).toMatch(
      /<span class="[^"]*hidden sm:inline[^"]*">자기계발 3</
    );
  });

  it('레이더 칸은 모바일 260px — 짧은 라벨로 좌우 여백을 줄여(radarLayout) 폭이 남으니 높이가 크기를 막지 않게', () => {
    const html = renderToStaticMarkup(
      <ReadingBalanceCard
        year={2026}
        balance={calculateReadingBalance(THREE)}
      />
    );
    expect(html).toMatch(
      /h-\[260px\] md:h-\[340px\][^>]*><div data-testid="radar"/
    );
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
