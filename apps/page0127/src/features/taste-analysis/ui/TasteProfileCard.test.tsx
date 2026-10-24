import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { TasteProfileCard } from './TasteProfileCard';

const HISTORY = [
  {
    id: 'd',
    personality_type: '내일의 나를 준비하는 사람',
    created_at: '2026-10-07T00:00:00Z',
    analyzed_books_count: 100,
    liked_topics: ['관계', '심리', '일상의 철학', '에세이 톤', '다섯째'],
  },
  {
    id: 'c',
    personality_type: '내일의 나를 준비하는 사람',
    created_at: '2026-07-29T00:00:00Z',
    analyzed_books_count: 100,
    liked_topics: null,
  },
  {
    id: 'b',
    personality_type: '한 우물을 깊이 파는 사람',
    created_at: '2026-07-21T00:00:00Z',
    analyzed_books_count: 40,
    liked_topics: null,
  },
];

const render = (props: Partial<Parameters<typeof TasteProfileCard>[0]> = {}) =>
  renderToStaticMarkup(
    <TasteProfileCard
      history={HISTORY}
      isOwner={false}
      analyzableBookCount={0}
      minBooks={5}
      {...props}
    />
  );

describe('TasteProfileCard', () => {
  it('최신 성향 크게 + 키워드 4개 + 변화 뱃지(묶음)', () => {
    const html = render();
    expect(html).toContain('내일의 나를 준비하는 사람');
    expect(html).toContain('#관계');
    expect(html).toContain('#에세이 톤');
    expect(html).not.toContain('#다섯째');
    expect(html).toContain('취향의 변화');
    expect(html).toContain('×2');
    // 방문자는 회차 상세로 가는 링크가 없다
    expect(html).not.toContain('/dashboard/taste-analysis/');
  });

  it('주인은 뱃지·자세히가 회차 상세로 이어지고, 분석 권수를 본다', () => {
    const html = render({ isOwner: true });
    expect(html).toContain('href="/dashboard/taste-analysis/d"');
    expect(html).toContain('href="/dashboard/taste-analysis/b"');
    expect(html).toContain('책 100권 기준');
  });

  it('방문자에게는 분석 권수를 보이지 않는다 — 비공개 책 수가 드러난다(RPC 도 null 로 준다)', () => {
    const html = render({
      history: HISTORY.map((h) => ({ ...h, analyzed_books_count: null })),
    });
    expect(html).not.toContain('권 기준');
    expect(html).toContain('내일의 나를 준비하는 사람');
  });

  it('명함이 이름을 말하고 있으면(showType=false) 이름 없이 근거만 보인다', () => {
    const html = render({ history: [HISTORY[0]], showType: false });
    expect(html).not.toContain('내일의 나를 준비하는 사람');
    expect(html).toContain('AI 독서 성향');
    expect(html).toContain('#관계');
  });

  it('근거 책이 있으면 표지를 그 책 기록으로 잇는다', () => {
    const html = render({
      username: 'hyejin',
      history: [
        {
          ...HISTORY[0],
          evidence: [
            {
              book_id: 'book-1',
              title: '모순',
              cover_image: 'https://image.yes24.com/goods/1/XL',
              reason: '결',
              topics: ['관계'],
            },
          ],
        },
      ],
    });
    expect(html).toContain('이 책들에서 읽었어요');
    expect(html).toContain('href="/hyejin/book-1"');
  });

  it('근거가 없으면(옛 분석·마이그레이션 전) 근거 줄을 그리지 않는다', () => {
    expect(render({ history: [HISTORY[0]] })).not.toContain(
      '이 책들에서 읽었어요'
    );
  });

  it('이력이 한 번뿐이면 변화 줄을 그리지 않는다', () => {
    expect(render({ history: [HISTORY[0]] })).not.toContain('취향의 변화');
  });

  it('분석이 없으면 방문자에겐 아무것도, 주인에겐 남은 권수 자리표시', () => {
    expect(render({ history: [] })).toBe('');
    const owner = render({
      history: [],
      isOwner: true,
      analyzableBookCount: 3,
    });
    expect(owner).toContain('평가한 완독 책 3/5권');
    expect(owner).toContain('2권 더 모이면');
  });
});
