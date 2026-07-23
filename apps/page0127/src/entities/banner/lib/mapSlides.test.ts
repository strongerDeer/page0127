import { describe, expect, it } from 'vitest';

import { rowToHeroSlide, slidesOrFallback } from './mapSlides';

import type { HeroSlide, HeroSlideRow } from '../types';

const row: HeroSlideRow = {
  id: 'uuid-1',
  eyebrow: 'eb',
  line1: 'a',
  line2: 'b',
  sub: 's',
  href: '/x',
  cta: 'go',
  bg: '#000',
  fg: '#fff',
  sort_order: 0,
  is_active: true,
};

describe('rowToHeroSlide', () => {
  it('DB 행을 HeroSlide로 매핑(lines는 [line1,line2])', () => {
    expect(rowToHeroSlide(row)).toEqual({
      id: 'uuid-1',
      eyebrow: 'eb',
      lines: ['a', 'b'],
      sub: 's',
      href: '/x',
      cta: 'go',
      bg: '#000',
      fg: '#fff',
    });
  });
});

describe('slidesOrFallback', () => {
  const fallback: HeroSlide[] = [
    {
      id: 'f',
      eyebrow: '',
      lines: ['f1', 'f2'],
      sub: '',
      href: '/',
      cta: 'c',
      bg: '#1',
      fg: '#2',
    },
  ];
  it('행이 있으면 매핑 결과', () => {
    expect(slidesOrFallback([row], fallback).map((s) => s.id)).toEqual([
      'uuid-1',
    ]);
  });
  it('행이 비면 폴백', () => {
    expect(slidesOrFallback([], fallback)).toBe(fallback);
  });
});
