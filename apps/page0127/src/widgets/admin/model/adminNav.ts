import type { LucideIcon } from 'lucide-react';

/** 메뉴 옆 숫자 배지를 붙일 수 있는 칸. 숫자는 레이아웃이 서버에서 한 번 읽어 내려 준다 */
export type AdminNavBadgeKey = 'reports' | 'books' | 'members';

export type AdminNavBadges = Partial<Record<AdminNavBadgeKey, number>>;

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: AdminNavBadgeKey;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

/**
 * 지금 주소가 이 메뉴인가.
 * '/admin'(대시보드)은 모든 어드민 주소의 앞부분이라 정확히 같을 때만 켠다.
 * 나머지는 하위 주소(/admin/members/123, /admin/stories/new)까지 같은 메뉴로 본다.
 */
export const isActiveAdminHref = (pathname: string, href: string): boolean =>
  href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);

/** 배지 글자. 0·조회 실패(undefined)는 안 그린다 — 0을 매일 보이면 1이 생겨도 눈에 안 띈다 */
export const formatAdminBadge = (count: number | undefined): string | null => {
  if (!count || count <= 0) return null;
  return count > 99 ? '99+' : String(count);
};
