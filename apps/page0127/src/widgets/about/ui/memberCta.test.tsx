import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { AboutHero } from './AboutHero';

const member = { username: 'reader', displayName: '리더' };

describe('홈 버튼 — 로그인 여부에 따라 바뀐다', () => {
  it('비로그인 첫 화면은 맛보기·안내로 내려간다', () => {
    const html = renderToStaticMarkup(
      <AboutHero startHref='#first-impression' />
    );
    expect(html).toContain('내 책장 만들어 보기');
    expect(html).not.toContain('내 서재로');
  });

  it('로그인 첫 화면은 내 서재로·서재 공유하기', () => {
    const html = renderToStaticMarkup(<AboutHero member={member} />);
    expect(html).toContain('href="/reader"');
    expect(html).toContain('서재 공유하기');
    expect(html).not.toContain('내 책장 만들어 보기');
  });
});
