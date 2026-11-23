import { describe, expect, it } from 'vitest';

import { getTocGroups, isTocLinkActive } from './tocLinks';

const hrefs = (links: { href: string }[]) => links.map((l) => l.href);

describe('getTocGroups', () => {
  it('로그인 안 한 방문자도 전체 도서·책 이야기·소개로 갈 수 있다', () => {
    // 모바일에선 GnbNav 가 숨는다 — 목차가 없으면 이 세 곳은 푸터로만 닿았다(2026-11-23).
    const { account, main, sub } = getTocGroups({
      isLoggedIn: false,
      username: null,
    });

    expect(account).toEqual([]);
    expect(hrefs(main)).toEqual(['/books/all', '/blog', '/about']);
    expect(hrefs(sub)).toEqual(['/updates', '/contact']);
  });

  it('로그인하면 내 서재·설정이 위에 붙는다', () => {
    const { account } = getTocGroups({ isLoggedIn: true, username: 'hj' });

    expect(hrefs(account)).toEqual(['/hj', '/settings']);
  });

  it('username 이 아직 없으면 내 서재는 감춘다', () => {
    const { account } = getTocGroups({ isLoggedIn: true, username: null });

    expect(hrefs(account)).toEqual(['/settings']);
  });

  it('하단 탭바에 있는 곳(라운지·리더 찾기·알림)은 다시 넣지 않는다', () => {
    const { account, main, sub } = getTocGroups({
      isLoggedIn: true,
      username: 'hj',
    });
    const all = hrefs([...account, ...main, ...sub]);

    expect(all).not.toContain('/feed');
    expect(all).not.toContain('/search');
    expect(all).not.toContain('/notifications');
  });
});

describe('isTocLinkActive', () => {
  it('하위 경로도 같은 칸으로 본다 (책 이야기 글 → 책 이야기)', () => {
    expect(
      isTocLinkActive('/blog/some-story', { href: '/blog', label: '' }, null)
    ).toBe(true);
  });

  it('비슷한 앞부분만 같은 다른 주소는 아니다', () => {
    expect(
      isTocLinkActive('/blogger', { href: '/blog', label: '' }, null)
    ).toBe(false);
  });

  it('내 서재는 정확히 일치할 때만 — 책 상세(/hj/책)는 아니다', () => {
    const myLibrary = { href: '/hj', label: '내 서재' };

    expect(isTocLinkActive('/hj', myLibrary, 'hj')).toBe(true);
    expect(isTocLinkActive('/hj/book-1', myLibrary, 'hj')).toBe(false);
  });
});
