import { describe, expect, it } from 'vitest';

import { isProtectedPath } from './protectedRoutes';

describe('isProtectedPath', () => {
  it('보호 경로는 true', () => {
    expect(isProtectedPath('/feed')).toBe(true);
    expect(isProtectedPath('/settings/profile')).toBe(true);
    expect(isProtectedPath('/admin')).toBe(true);
    expect(isProtectedPath('/notifications')).toBe(true);
  });

  it('공개 예외가 보호 목록을 이긴다', () => {
    // /books 로 시작하지만 누구나 볼 수 있어야 하는 경로
    expect(isProtectedPath('/books/all')).toBe(false);
    expect(isProtectedPath('/books/info/abc-123')).toBe(false);
  });

  it('개인 서재 책 상세는 보호 경로다', () => {
    expect(isProtectedPath('/books/some-book-id')).toBe(true);
  });

  it('공개 페이지는 false', () => {
    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/login')).toBe(false);
    expect(isProtectedPath('/terms')).toBe(false);
    // 공개 프로필·공개 책 상세 — /{username}, /{username}/{bookId}
    expect(isProtectedPath('/dreamfulbud')).toBe(false);
    expect(isProtectedPath('/dreamfulbud/book-id')).toBe(false);
  });

  it('접두사만 같은 다른 경로를 보호로 오인하지 않는다', () => {
    // '/searchable' 은 '/search' 로 시작하지만 다른 경로다
    expect(isProtectedPath('/searchable')).toBe(false);
    expect(isProtectedPath('/bookstore')).toBe(false);
  });
});
