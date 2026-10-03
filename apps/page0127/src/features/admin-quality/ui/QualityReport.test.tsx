import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QualityReport } from './QualityReport';

/**
 * 리포트의 목록이 목록으로 보이는지 고정한다.
 *
 * 2026-10-03 확인: `prose` 클래스에 스타일을 맡겼는데 typography 플러그인이 없어
 * 효과가 없었고, Tailwind preflight 가 글머리표를 지워 "주요 발견" 항목들이
 * 한 덩어리 문단처럼 붙어 보였다. 클래스가 다시 빠지면 같은 모습이 된다.
 */
describe('QualityReport', () => {
  const md = '**핵심:** 요약\n\n**주요 발견**\n- 첫 항목\n- 둘째 항목\n\n1. 액션';
  const html = renderToStaticMarkup(<QualityReport md={md} />);

  it('불릿 목록에 글머리표 스타일이 붙는다', () => {
    expect(html).toMatch(/<ul class="[^"]*list-disc[^"]*">/);
    expect(html).toContain('<li>첫 항목</li>');
  });

  it('번호 목록에 번호 스타일이 붙는다', () => {
    expect(html).toMatch(/<ol class="[^"]*list-decimal[^"]*">/);
  });

  it('효과 없는 prose 클래스에 기대지 않는다', () => {
    expect(html).not.toContain('prose');
  });

  it('리포트가 없으면 아무것도 그리지 않는다', () => {
    expect(renderToStaticMarkup(<QualityReport md={null} />)).toBe('');
  });
});
