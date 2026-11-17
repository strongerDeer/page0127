import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COVER_BG,
  DEFAULT_COVER_FG,
  rowToHeroSlide,
  slidesOrFallback,
} from './mapSlides';

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
  audience: 'all',
  starts_at: null,
  ends_at: null,
  click_count: 0,
  belt_style: 'custom',
  cover_style: 'default',
  cover_bg: null,
  cover_fg: null,
  cover_title: null,
  show_number: true,
  art_url: null,
  art_x: 50,
  art_y: 70,
  art_w: 40,
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
      beltStyle: 'custom',
      cover: { style: 'default' },
    });
  });

  it('cover_style=custom 이면 색·제목·그림을 담고, 빈 제목은 null', () => {
    const slide = rowToHeroSlide({
      ...row,
      belt_style: 'default',
      cover_style: 'custom',
      cover_bg: '#b3261e',
      cover_fg: '#fff8ec',
      cover_title: '  ',
      show_number: false,
      art_url: 'https://x/a.webp',
      art_x: 30,
      art_y: 60,
      art_w: 45,
    });
    expect(slide.beltStyle).toBe('default');
    expect(slide.cover).toEqual({
      style: 'custom',
      bg: '#b3261e',
      fg: '#fff8ec',
      title: null,
      showNumber: false,
      art: { url: 'https://x/a.webp', x: 30, y: 60, w: 45 },
    });
  });

  it('custom 인데 색이 비면 기본 표지 색, 그림 없으면 art=null', () => {
    const slide = rowToHeroSlide({ ...row, cover_style: 'custom' });
    expect(slide.cover).toEqual({
      style: 'custom',
      bg: DEFAULT_COVER_BG,
      fg: DEFAULT_COVER_FG,
      title: null,
      showNumber: true,
      art: null,
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
      beltStyle: 'custom',
      cover: { style: 'default' },
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
