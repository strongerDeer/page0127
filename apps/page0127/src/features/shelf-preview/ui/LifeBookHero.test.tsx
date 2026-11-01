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
  it('인생책 질문을 제목으로 묻고, 위 섹션과 겹치는 공감 문장은 쓰지 않는다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).toContain('당신의 인생책은?');
    expect(html).toContain('그 책으로 내 서재를 시작해 보세요');
    expect(html).not.toContain('기록은 여기저기 흩어져요');
    expect(html).not.toContain('기억나는 책 세 권을 골라보세요');
  });

  it('첫 화면의 "내 책장 만들어 보기"가 내려올 자리(#first-impression)가 있다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).toContain('id="first-impression"');
  });

  it('처음에는 빈 실루엣과 펼친 검색칸이 있고, 등록 버튼은 없다', () => {
    const html = renderToStaticMarkup(<LifeBookHero leaders={[]} />);
    expect(html).toContain('border-dashed');
    expect(html).toContain('책 제목이나 저자');
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
