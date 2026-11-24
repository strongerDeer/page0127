import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { AdminNav } from './AdminNav';
import { AdminNavLink } from './AdminNavLink';

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

describe('AdminNav → AdminNavLink 경계', () => {
  // 서버 컴포넌트가 클라이언트 컴포넌트에 함수(아이콘 컴포넌트 등)를 넘기면 운영에서 500 이 난다.
  // renderToStaticMarkup 은 경계를 흉내 내지 않아 위 테스트로는 못 잡는다 → props 를 직접 본다.
  it('클라이언트 링크로 넘기는 props 에 함수가 없다', () => {
    const tree = AdminNav({ badges: {} });
    const props: Record<string, unknown>[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!isValidElement(node)) return;
      const p = node.props as Record<string, unknown>;
      if (node.type === AdminNavLink) props.push(p);
      walk(p.children);
    };
    walk(tree);
    expect(props.length).toBe(11);
    // 객체 안에 숨은 함수(예: { icon: LucideIcon })도 경계를 못 넘는다 — 그려진 JSX 는 괜찮다
    const hasFunction = (v: unknown): boolean => {
      if (typeof v === 'function') return true;
      if (isValidElement(v) || v === null || typeof v !== 'object')
        return false;
      return Object.values(v).some(hasFunction);
    };
    for (const p of props) {
      for (const [k, v] of Object.entries(p)) {
        expect(hasFunction(v), `prop ${k}`).toBe(false);
      }
      // 아이콘도 컴포넌트가 아니라 그려진 JSX 여야 한다
      expect(isValidElement(p.icon)).toBe(true);
    }
  });
});
