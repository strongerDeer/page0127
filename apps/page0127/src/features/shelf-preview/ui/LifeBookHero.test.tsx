import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { LifeBookHero } from './LifeBookHero';

import type { LeaderLifeBook } from '../model/leaderLifeBooks';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const leader = (isbn: string): LeaderLifeBook => ({
  isbn,
  title: `리더 책 ${isbn}`,
  coverSrc: `https://image.yes24.com/goods/${isbn}/XL`,
  coverFallback: null,
});

describe('LifeBookHero', () => {
  it('h1 은 A 와 같고, 소개 문장 없이 질문을 크게 묻는다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).toContain('책장을 보면,');
    expect(html).toContain('당신의 인생책은?');
    expect(html).not.toContain('읽은 책을 골라 책장을 채워주세요');
  });

  it('처음에는 빈 실루엣과 펼친 검색칸이 있고, 등록 버튼은 없다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).toContain('border-dashed');
    expect(html).toContain('제목이나 저자로 찾아보세요');
    expect(html).not.toContain('다른 책 찾아보기');
    expect(html).not.toContain('내 서재에 등록하기');
  });

  it('리더 인생책이 있으면 표지만 보여 주고 인원 수는 없다', () => {
    const html = renderToStaticMarkup(
      <LifeBookHero leaders={['1', '2', '3'].map(leader)} />
    );
    expect(html).toContain('리더들이 뽑은 인생책이에요');
    expect(html).toContain('리더 책 3');
    expect(html).not.toMatch(/\d+명/);
    // 보여주기만 한다 — 누르는 대상이 아니다
    expect(html.match(/<button/g) ?? []).toHaveLength(1); // 검색 [찾기] 버튼뿐
  });

  it('리더 인생책이 없으면 그 줄을 그리지 않는다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).not.toContain('리더들이 뽑은 인생책이에요');
  });
});
