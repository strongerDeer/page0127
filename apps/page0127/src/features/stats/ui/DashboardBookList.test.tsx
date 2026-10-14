import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { DashboardBookList } from './DashboardBookList';

describe('DashboardBookList 보기 전환', () => {
  it('아이콘만이던 전환 버튼에 "책등 / 표지" 글자를 붙인다', () => {
    const html = renderToStaticMarkup(
      <DashboardBookList
        books={[createTestBook({ completed_date: '2026-01-01' })]}
        categories={[]}
        selectedCategories={[]}
        searchQuery=''
        onCategoriesChange={() => {}}
        onSearchChange={() => {}}
      />
    );
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*책등/);
    expect(html).toContain('표지</span>');
  });

  it('선택된 쪽은 파란 면(bg-primary), 아닌 쪽은 아니다 — 무엇이 선택됐는지 보이게', () => {
    const html = renderToStaticMarkup(
      <DashboardBookList
        books={[createTestBook({ completed_date: '2026-01-01' })]}
        categories={[]}
        selectedCategories={[]}
        searchQuery=''
        onCategoriesChange={() => {}}
        onSearchChange={() => {}}
      />
    );
    const buttons =
      html.match(/<button[^>]*aria-pressed="(true|false)"[^>]*>/g) ?? [];
    const pressed =
      buttons.find((b) => b.includes('aria-pressed="true"')) ?? '';
    const unpressed =
      buttons.find((b) => b.includes('aria-pressed="false"')) ?? '';
    expect(pressed).toContain('bg-primary');
    expect(unpressed).not.toContain('bg-primary');
  });
});
