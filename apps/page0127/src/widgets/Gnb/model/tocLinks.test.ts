import { describe, expect, it } from 'vitest';

import { getTocGroups, isTocLinkActive } from './tocLinks';

const hrefs = (links: { href: string }[]) => links.map((l) => l.href);

describe('getTocGroups', () => {
  it('비로그인: 하단 탭이 없는 폰을 위해 전체 도서·책 이야기, 그리고 하루 한 번·소개 묶음', () => {
    const { account, main, daily, sub } = getTocGroups({
      isLoggedIn: false,
    });

    expect(account).toEqual([]);
    expect(hrefs(main)).toEqual(['/books/all', '/blog']);
    expect(hrefs(daily)).toEqual(['/sentence', '/typing/little-prince']);
    expect(hrefs(sub)).toEqual(['/about', '/updates', '/contact']);
  });

  it('로그인: 맨 위에 내 서재에 딸린 곳(PC 프로필 메뉴와 같은 목록)과 설정', () => {
    const { account } = getTocGroups({ isLoggedIn: true, username: 'hj' });
    expect(hrefs(account)).toEqual([
      '/hj/quotes',
      '/books/recap',
      '/hj/badges',
      '/dashboard/taste-analysis',
      '/settings',
    ]);
  });

  it('아이디를 아직 모르면(가입 직후) 아이디가 들어가는 주소는 뺀다', () => {
    const { account } = getTocGroups({ isLoggedIn: true, username: null });
    expect(hrefs(account)).toEqual([
      '/books/recap',
      '/dashboard/taste-analysis',
      '/settings',
    ]);
  });

  it('메뉴 네 칸(내 서재·라운지·전체 도서·책 이야기)은 로그인하면 목차에 다시 넣지 않는다', () => {
    const { account, main, daily, sub } = getTocGroups({
      isLoggedIn: true,
      username: 'hj',
    });
    const all = hrefs([...account, ...main, ...daily, ...sub]);

    for (const href of ['/hj', '/feed', '/books/all', '/blog']) {
      expect(all).not.toContain(href);
    }
  });
});

describe('getTocGroups — 단독 페이지(/sentence·/typing)', () => {
  it('로그인: 상단 메뉴·하단 탭이 없으니 메뉴 네 칸을 목차에 넣는다', () => {
    const { main } = getTocGroups({
      isLoggedIn: true,
      username: 'hj',
      standalone: true,
    });
    expect(hrefs(main)).toEqual(['/hj', '/feed', '/books/all', '/blog']);
  });

  it('비로그인: 전체 도서·책 이야기(내 서재·라운지는 로그인 뒤)', () => {
    const { main } = getTocGroups({ isLoggedIn: false, standalone: true });
    expect(hrefs(main)).toEqual(['/books/all', '/blog']);
  });

  it('아이디를 아직 모르면 내 서재는 뺀다', () => {
    const { main } = getTocGroups({
      isLoggedIn: true,
      username: null,
      standalone: true,
    });
    expect(hrefs(main)).toEqual(['/feed', '/books/all', '/blog']);
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
