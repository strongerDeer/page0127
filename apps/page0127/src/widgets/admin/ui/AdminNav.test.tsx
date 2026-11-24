import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/members/abc',
}));

describe('AdminNav', () => {
  const html = renderToStaticMarkup(
    <AdminNav badges={{ reports: 2, books: 0, members: 120 }} />
  );

  it('유입분석이 첫 메뉴, 품질은 점검 묶음 뒤쪽', () => {
    const order = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(order[0]).toBe('/admin/analytics');
    expect(order.indexOf('/admin/quality')).toBeGreaterThan(
      order.indexOf('/admin/reports')
    );
  });

  it('하위 주소에서도 그 메뉴에 aria-current', () => {
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/admin\/members"/);
  });

  it('0 인 배지는 안 그리고, 100 이상은 99+', () => {
    expect(html).toContain('>2<');
    expect(html).toContain('>99+<');
    // 도서 검수(0)에는 배지가 없다 → 배지는 두 개뿐
    expect(html.match(/건 대기/g)).toHaveLength(2);
  });
});
