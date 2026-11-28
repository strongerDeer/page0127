import { describe, expect, it } from 'vitest';

import {
  BOOK_INDEX_MIN_READERS,
  buildBookMetaDescription,
  countReadersByIsbn,
  isBookIndexable,
} from './bookIndexing';

describe('isBookIndexable', () => {
  it('리더가 기준 수 이상이면 색인한다', () => {
    expect(
      isBookIndexable({ readerCount: BOOK_INDEX_MIN_READERS, hasStory: false })
    ).toBe(true);
  });

  it('리더가 적어도 책 이야기가 있으면 색인한다', () => {
    expect(isBookIndexable({ readerCount: 0, hasStory: true })).toBe(true);
  });

  it('리더 1명·이야기 없음은 색인하지 않는다', () => {
    expect(isBookIndexable({ readerCount: 1, hasStory: false })).toBe(false);
  });
});

describe('countReadersByIsbn', () => {
  it('재독은 한 명으로, 읽고 싶은 책은 리더로 세지 않는다', () => {
    const map = countReadersByIsbn([
      { isbn: 'A', user_id: 'u1', status: 'completed' },
      { isbn: 'A', user_id: 'u1', status: 'completed' },
      { isbn: 'A', user_id: 'u2', status: 'reading' },
      { isbn: 'A', user_id: 'u3', status: 'want_to_read' },
      { isbn: null, user_id: 'u4', status: 'completed' },
    ]);
    expect(map.get('A')).toBe(2);
    expect(map.size).toBe(1);
  });
});

describe('buildBookMetaDescription', () => {
  it('리더 수와 평균 별점을 앞세운다', () => {
    expect(
      buildBookMetaDescription({
        title: '불편한 편의점',
        author: '김호연',
        readerCount: 3,
        avgRating: 4.25,
        ratingCount: 2,
      })
    ).toBe(
      '불편한 편의점 - 김호연 | 리더 3명이 읽은 책, 평균 ★4.3. page0127.에서 이 책을 읽은 사람들의 별점과 기록, 남긴 문장을 만나 보고 내 책장에도 꽂아 보세요.'
    );
  });

  it('평가가 없으면 별점을 빼고, 리더가 없으면 첫 리더 안내', () => {
    expect(
      buildBookMetaDescription({
        title: '책',
        author: null,
        readerCount: 1,
        avgRating: 0,
        ratingCount: 0,
      })
    ).toBe(
      '책 | 리더 1명이 읽은 책. page0127.에서 이 책을 읽은 사람들의 별점과 기록, 남긴 문장을 만나 보고 내 책장에도 꽂아 보세요.'
    );
    expect(
      buildBookMetaDescription({
        title: '책',
        author: '저자',
        readerCount: 0,
        avgRating: 0,
        ratingCount: 0,
      })
    ).toContain('첫 리더');
  });
});
