import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { AboutHero } from './AboutHero';
import { FinalCta } from './FinalCta';

vi.mock('@/features/auth/ui/OAuthLoginButtons', () => ({
  OAuthLoginButtons: () => <div>가입 버튼</div>,
}));

const member = { username: 'reader', displayName: '리더' };

describe('홈 버튼 — 로그인 여부에 따라 바뀐다', () => {
  it('비로그인 첫 화면은 맛보기·안내로 내려간다', () => {
    const html = renderToStaticMarkup(
      <AboutHero books={[]} startHref='#first-impression' />
    );
    expect(html).toContain('내 책장 만들어 보기');
    expect(html).not.toContain('내 서재로');
  });

  it('로그인 첫 화면은 내 서재로·서재 공유하기', () => {
    const html = renderToStaticMarkup(<AboutHero books={[]} member={member} />);
    expect(html).toContain('href="/reader"');
    expect(html).toContain('서재 공유하기');
    expect(html).not.toContain('내 책장 만들어 보기');
  });

  it('로그인 마무리 카드는 가입 버튼 대신 책 꽂기·내 서재로', () => {
    const html = renderToStaticMarkup(<FinalCta covers={[]} member={member} />);
    expect(html).toContain('href="/books/add"');
    expect(html).toContain('href="/reader"');
    expect(html).not.toContain('가입 버튼');
  });

  it('비로그인 마무리 카드는 가입 버튼', () => {
    const html = renderToStaticMarkup(<FinalCta covers={[]} />);
    expect(html).toContain('가입 버튼');
  });
});
