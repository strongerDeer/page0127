import { describe, expect, it } from 'vitest';

import { formatAdminBadge, isActiveAdminHref } from './adminNav';

describe('isActiveAdminHref', () => {
  it('대시보드는 /admin 에서만 켜진다', () => {
    expect(isActiveAdminHref('/admin', '/admin')).toBe(true);
    expect(isActiveAdminHref('/admin/analytics', '/admin')).toBe(false);
  });

  it('하위 주소도 같은 메뉴로 본다', () => {
    expect(isActiveAdminHref('/admin/members/abc', '/admin/members')).toBe(
      true
    );
    expect(isActiveAdminHref('/admin/stories/new', '/admin/stories')).toBe(
      true
    );
  });

  it('앞부분만 같은 다른 주소는 켜지지 않는다', () => {
    expect(isActiveAdminHref('/admin/booksx', '/admin/books')).toBe(false);
  });
});

describe('formatAdminBadge', () => {
  it('0·실패면 그리지 않는다', () => {
    expect(formatAdminBadge(0)).toBeNull();
    expect(formatAdminBadge(undefined)).toBeNull();
  });

  it('100 이상은 99+', () => {
    expect(formatAdminBadge(3)).toBe('3');
    expect(formatAdminBadge(120)).toBe('99+');
  });
});
