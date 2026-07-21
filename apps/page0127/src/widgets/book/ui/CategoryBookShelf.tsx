import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import { PublicBookShelf } from './PublicBookShelf';

import type { Book } from '@/entities/book';

type CategoryBookShelfProps = {
  books: Book[];
  username?: string;
};

/**
 * "전체" 뷰 책장을 대분류(카테고리)별 섹션으로 나눠 보여준다
 *
 * 학습 포인트:
 * - PublicBookShelf는 "렌더링만" 담당하는 단일 책임 컴포넌트라 그룹핑 로직을 넣지 않는다
 * - 대신 이 컴포넌트가 카테고리별로 묶어서 섹션마다 PublicBookShelf를 호출한다
 */
export const CategoryBookShelf = ({ books, username }: CategoryBookShelfProps) => {
  // 카테고리별로 책을 묶는다 — books 순서를 그대로 유지한 채 버킷에 담아서
  // DashboardBookList가 이미 적용한 정렬(최신순/별점순 등)이 섹션 안에서도 유지되게 한다
  const grouped = new Map<string, Book[]>();
  books.forEach((book) => {
    const category = mapToMainCategory(book.category);
    const bucket = grouped.get(category);
    if (bucket) {
      bucket.push(book);
    } else {
      grouped.set(category, [book]);
    }
  });

  // 책이 많은 카테고리부터, '기타'는 개수와 무관하게 항상 마지막
  const sections = [...grouped.entries()].sort(
    ([categoryA, booksA], [categoryB, booksB]) => {
      if (categoryA === '기타') return 1;
      if (categoryB === '기타') return -1;
      return booksB.length - booksA.length;
    }
  );

  return (
    <div className='space-y-10'>
      {sections.map(([category, categoryBooks]) => (
        <div key={category}>
          <h4 className='mb-2 text-base font-semibold text-text-strong'>
            {category}{' '}
            <span className='font-normal text-text-subtle'>
              {categoryBooks.length}권
            </span>
          </h4>
          <PublicBookShelf books={categoryBooks} username={username} compact />
        </div>
      ))}
    </div>
  );
};
