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
  const md =
    '**핵심:** 요약\n\n**주요 발견**\n- 첫 항목\n- 둘째 항목\n\n1. 액션';
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

describe('QualityReport — 틀대로 생성된 리포트', () => {
  const md = [
    '**핵심:** 나빠진 항목 없음, 프로필 JS 가 가장 큰 개선 여지',
    '',
    '**주요 발견**',
    '- 첫 발견',
    '',
    '**다음 주 우선순위**',
    '1. 프로필 JS 줄이기: 번들 분석으로 큰 의존성을 찾는다',
  ].join('\n');

  it('핵심 → 할 일 → 근거(접힘) 순서로 그린다', () => {
    const html = renderToStaticMarkup(
      <QualityReport md={md} regressionCount={0} />
    );
    const order = ['나빠진 항목 없음, 프로필', '프로필 JS 줄이기', '<details>'];
    const idx = order.map((s) => html.indexOf(s));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(html).toContain('번들 분석으로 큰 의존성을 찾는다');
  });

  it('판정 배지는 회귀 건수로 정한다 (옛 레코드 undefined 면 숨김)', () => {
    expect(
      renderToStaticMarkup(<QualityReport md={md} regressionCount={2} />)
    ).toContain('나빠진 항목 2건');
    expect(renderToStaticMarkup(<QualityReport md={md} />)).not.toContain(
      '나빠진 항목 없음</span>'
    );
  });
});
