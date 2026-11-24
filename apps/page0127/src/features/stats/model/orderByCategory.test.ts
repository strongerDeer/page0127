import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { orderByCategory } from './orderByCategory';

const book = (id: string, category: string | null) =>
  createTestBook({ id, category });

describe('orderByCategory', () => {
  it('많이 읽은 분야부터 붙여 세우고, 분야 안에서는 들어온 순서를 지킨다', () => {
    const ordered = orderByCategory([
      book('a', '국내도서-에세이'),
      book('b', '국내도서-소설/시/희곡'),
      book('c', '국내도서-에세이'),
      book('d', '국내도서-소설/시/희곡'),
      book('e', '국내도서-소설/시/희곡'),
    ]);
    expect(ordered.map((b) => b.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
  });

  it("'기타'는 권수와 상관없이 맨 끝", () => {
    const ordered = orderByCategory([
      book('x', null),
      book('y', null),
      book('z', '국내도서-에세이'),
    ]);
    expect(ordered.map((b) => b.id)).toEqual(['z', 'x', 'y']);
  });
});
