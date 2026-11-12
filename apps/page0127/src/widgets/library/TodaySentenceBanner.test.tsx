import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { TodaySentenceBanner } from './TodaySentenceBanner';

describe('TodaySentenceBanner', () => {
  it('오늘 날짜(앞 0 없이)와 함께 캘린더로 내려가는 링크', () => {
    const html = renderToStaticMarkup(
      <TodaySentenceBanner today='2026-11-02' />
    );
    expect(html).toContain('href="#reading-calendar"');
    expect(html).toContain('11월 2일 · 하루 한 문장');
    expect(html).toContain('오늘의 문장, 아직 안 펼쳤어요');
  });
});
