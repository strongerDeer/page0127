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
});
