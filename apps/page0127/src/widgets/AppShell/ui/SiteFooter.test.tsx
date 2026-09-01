import { renderToStaticMarkup } from 'react-dom/server';

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './SiteFooter';

/**
 * 푸터가 지키는 것은 디자인이 아니라 **연락 수단**이다.
 *
 * 2026-08-25 확인: 푸터가 랜딩과 문서 페이지에만 붙어 있어서, 로그인해서 쓰다가
 * 막힌 사람은 화면에서 문의할 곳을 찾을 수 없었다. 베타는 피드백을 들으려고 여는
 * 것인데 그 통로가 로그인 후 화면에 없었던 셈이다. 개인정보처리방침·이용약관도
 * 같은 문제였다 — 이쪽은 법적으로도 닿을 수 있어야 한다.
 *
 * 그래서 두 가지를 함께 고정한다: 링크가 있는가, 그리고 **앱 셸이 그것을 그리는가.**
 * 링크만 검사하면 푸터가 다시 일부 화면에서만 렌더돼도 통과한다.
 */
describe('SiteFooter', () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  it('문의·개인정보처리방침·이용약관으로 가는 길이 있다', () => {
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });

  it('베타 서비스임을 알리고 문의로 유도한다', () => {
    // 고지와 "말하는 방법"이 떨어져 있으면 둘 다 소용이 없다.
    expect(html).toContain('베타');
    expect(html).toContain('문의');
  });

  it('탭바에 가리지 않도록 여백을 덧붙일 수 있다', () => {
    // 모바일 로그인 화면에는 하단 탭바가 있어, 여백이 없으면 푸터 끝이 가린다.
    const withPadding = renderToStaticMarkup(
      <SiteFooter className='pb-16 md:pb-0' />
    );

    expect(withPadding).toContain('pb-16');
  });
});

describe('앱 셸', () => {
  it('모든 화면에 푸터를 그린다', () => {
    // 셸은 로그인 전/후 모든 라우트가 지나는 유일한 지점이다. 여기서 빠지면
    // 다시 "일부 화면에만 있는 푸터"가 된다.
    const source = readFileSync(
      new URL('./AppShellLayout.tsx', import.meta.url),
      'utf8'
    );

    expect(source).toContain('<SiteFooter');
  });
});
