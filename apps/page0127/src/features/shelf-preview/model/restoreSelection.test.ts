import { describe, expect, it } from 'vitest';

import { restoreSelection } from './restoreSelection';

import type { PendingBook, ShelfPick } from './types';

const STORAGE = 'https://abc.supabase.co';

const book = (isbn: string, over: Partial<PendingBook> = {}): PendingBook => ({
  isbn,
  provider_item_id: null,
  title: isbn,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: null,
  ...over,
});

const pick = (b: PendingBook): ShelfPick => ({
  book: b,
  coverSrc: `https://image.yes24.com/goods/${b.provider_item_id}`,
  coverFallback: null,
  spineSrc: `${STORAGE}/storage/v1/object/public/spines/${b.isbn}.jpg`,
});

describe('restoreSelection', () => {
  it('목록에 있는 책은 목록의 그리기 주소를 쓴다 — isbn 이 달라도 상품번호로 알아본다', () => {
    const listed = pick(book('8936434594', { provider_item_id: '108422348' }));
    const saved = book('9788936434595', { provider_item_id: '108422348' });
    expect(restoreSelection([saved], [listed], STORAGE)).toEqual([listed]);
  });

  it('검색으로 고른 책은 보관된 주소 중 그릴 수 있는 것만 쓴다', () => {
    const saved = book('9788937462672', {
      cover_image: 'https://image.yes24.com/goods/4827619/L',
      spine_image: 'https://image.aladin.co.kr/spine.jpg',
    });
    const [restored] = restoreSelection([saved], [], STORAGE);
    expect(restored.book).toEqual(saved);
    expect(restored.coverSrc).toBe('https://image.yes24.com/goods/4827619/L');
    // 허용되지 않은 호스트를 next/image 에 넘기면 화면째 터진다
    expect(restored.spineSrc).toBeNull();
  });

  it('보관 순서를 지키고 같은 책은 한 번만', () => {
    const a = book('a');
    const b = book('b');
    expect(
      restoreSelection([b, a, b], [], STORAGE).map((p) => p.book.isbn)
    ).toEqual(['b', 'a']);
  });
});
