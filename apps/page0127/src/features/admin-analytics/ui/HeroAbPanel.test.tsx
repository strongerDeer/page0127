import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { parseDateRange } from '@/shared/lib/admin/dateRange';

import { HERO_AB_STEPS } from '../lib/gaEvents';
import { HeroAbPanel } from './HeroAbPanel';

const range = parseDateRange({ range: '7d' }, new Date('2026-11-10T03:00:00Z'));

const rows = (a: number[], b: number[]) =>
  HERO_AB_STEPS.map((s, i) => ({ ...s, a: a[i] ?? 0, b: b[i] ?? 0 }));

describe('HeroAbPanel', () => {
  it('측정기준이 없으면(null) 등록 안내를 보인다', () => {
    const html = renderToStaticMarkup(
      <HeroAbPanel range={range} rows={null} />
    );
    expect(html).toContain('hero_variant');
    expect(html).toContain('사용자 범위');
  });

  it('데이터가 전부 0 이면 스위치 안내를 보인다', () => {
    const html = renderToStaticMarkup(
      <HeroAbPanel range={range} rows={rows([], [])} />
    );
    expect(html).toContain('HERO_AB=on');
    expect(html).not.toContain('<table');
  });

  it('단계별 사용자 수와 첫 단계 대비 비율을 보인다', () => {
    const html = renderToStaticMarkup(
      <HeroAbPanel range={range} rows={rows([40, 20], [50, 10])} />
    );
    expect(html).toContain('(50%)'); // A: 20 / 40
    expect(html).toContain('(20%)'); // B: 10 / 50
    expect(html).not.toContain('아직 판단하기 이릅니다');
  });

  it('한쪽이라도 30명 미만이면 판단을 미룬다', () => {
    const html = renderToStaticMarkup(
      <HeroAbPanel range={range} rows={rows([40], [12])} />
    );
    expect(html).toContain('아직 판단하기 이릅니다');
  });
});
