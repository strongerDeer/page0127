import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { computeBadges } from './badges';
import { isClassicBook } from './isClassicBook';

const book = (title: string, author: string | null) =>
  createTestBook({
    title,
    author,
    category: '소설/시/희곡',
    completed_date: '2026-10-25',
  });

describe('고전 작품 판정', () => {
  it('공급자가 소설 대분류만 준 이방인·호밀밭의 파수꾼도 인정한다', () => {
    const books = [
      book('이방인', '알베르 카뮈'),
      book('호밀밭의 파수꾼', '제롬 데이비드 샐린저'),
    ];
    expect(books.every(isClassicBook)).toBe(true);
    expect(
      computeBadges({
        books,
        readingGoal: null,
        firstTasteAnalysisAt: null,
      }).find((b) => b.id === 'classics')
    ).toMatchObject({ earned: true, progress: { current: 2, target: 5 } });
  });
  it('번역자·판본·띄어쓰기 차이를 허용한다', () => {
    expect(
      isClassicBook(
        book(
          '호밀밭의파수꾼 (리커버)',
          'J. D. 샐린저 (지은이), 공경희 (옮긴이)'
        )
      )
    ).toBe(true);
    expect(isClassicBook(book('이방인 - 세계문학전집', 'Albert Camus'))).toBe(
      true
    );
  });
  it('동명 작품·해설서·같은 작가의 다른 작품·저자 미상은 제목으로 추측하지 않는다', () => {
    expect(isClassicBook(book('이방인', '다른 작가'))).toBe(false);
    expect(isClassicBook(book('이방인 해설', '알베르 카뮈'))).toBe(false);
    expect(isClassicBook(book('다른 작품', '알베르 카뮈'))).toBe(false);
    expect(isClassicBook(book('이방인', null))).toBe(false);
  });
  it('원래 고전 분류는 저자가 없어도 인정한다', () => {
    expect(
      isClassicBook({
        ...book('동양 선집', null),
        category: '국내도서>고전>동양고전',
      })
    ).toBe(true);
  });
});
