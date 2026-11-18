import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { AboutHero } from './AboutHero';

import type { HeroSlide } from '@/entities/banner/types';

const base: HeroSlide = {
  id: 's1',
  eyebrow: '크리스마스',
  lines: ['올해 마지막 선물은', '한 권의 책'],
  sub: '연말 독서 기록 보기',
  href: '/events/xmas',
  cta: '보기',
  bg: '#fff8ec',
  fg: '#8a1c1c',
  beltStyle: 'custom',
  cover: { style: 'default' },
};

describe('기념일 표지 — 어드민 배너로 홈 표지를 갈아입힌다', () => {
  it('기본 표지 + 직접 띠지: 띠지만 링크로 바뀐다', () => {
    const html = renderToStaticMarkup(<AboutHero belt={base} />);
    expect(html).toContain('href="/events/xmas"');
    expect(html).toContain('--belt:#fff8ec');
    expect(html).toContain('0127');
    expect(html).not.toContain('--cover:');
  });

  it('기본 띠지를 고르면 기본 문구, 링크 없음', () => {
    const html = renderToStaticMarkup(
      <AboutHero belt={{ ...base, beltStyle: 'default' }} />
    );
    expect(html).toContain('책장이 나를 소개한다');
    expect(html).not.toContain('href="/events/xmas"');
  });

  it('갈아입힌 표지: 색·그림·제목, 숫자 숨김, 소개 문장은 스크린리더용으로 남는다', () => {
    const html = renderToStaticMarkup(
      <AboutHero
        belt={{
          ...base,
          cover: {
            style: 'custom',
            bg: '#b3261e',
            fg: '#fff8ec',
            title: '메리 크리스마스,\n책 읽는 밤',
            showNumber: false,
            art: { url: 'https://x/tree.webp', x: 30, y: 55, w: 45 },
          },
        }}
      />
    );
    expect(html).toContain('--cover:#b3261e');
    expect(html).toContain('src="https://x/tree.webp"');
    expect(html).toContain('left:30%;top:55%;width:45%');
    expect(html).toContain('책 읽는 밤');
    expect(html).toContain('읽은 책을 꽂아 두면, 책장이 취향을 말해 줍니다');
    expect(html).not.toContain('0127<i>');
  });
});
