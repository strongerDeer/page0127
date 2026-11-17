import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { BackCover } from './BackCover';

vi.mock('@/features/auth/ui/OAuthLoginButtons', () => ({
  OAuthLoginButtons: () => <div>가입 버튼</div>,
}));

describe('뒤표지 — 홈의 마무리', () => {
  it('맺음 문장은 뒤표지 위의 진짜 제목이다', () => {
    const html = renderToStaticMarkup(<BackCover />);
    expect(html).toContain('id="book-back-title"');
    expect(html).toContain('오늘 읽은 한 권부터 꽂아 보세요.');
  });

  it('비로그인이면 책 아래에 가입 버튼', () => {
    const html = renderToStaticMarkup(<BackCover />);
    expect(html).toContain('가입 버튼');
    expect(html).toContain('처음부터 다시 펼치기');
  });

  it('로그인이면 가입 버튼 대신 책 꽂기·내 서재로', () => {
    const html = renderToStaticMarkup(
      <BackCover member={{ username: 'reader' }} />
    );
    expect(html).toContain('href="/books/add"');
    expect(html).toContain('href="/reader"');
    expect(html).not.toContain('가입 버튼');
  });
});
