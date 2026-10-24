import { describe, expect, it } from 'vitest';

import { createTestBook } from '../model/createTestBook';
import { withPersonalMemo } from './bookMemo';

describe('withPersonalMemo', () => {
  it('임베드된 메모를 personal_memo 로 펼치고 book_memos 키는 지운다', () => {
    const row = { ...createTestBook(), book_memos: { memo: '비밀 메모' } };
    const book = withPersonalMemo(row);
    expect(book.personal_memo).toBe('비밀 메모');
    expect('book_memos' in book).toBe(false);
  });

  it('남의 책(RLS 로 걸러져 null)이면 메모는 null', () => {
    expect(
      withPersonalMemo({ ...createTestBook(), book_memos: null }).personal_memo
    ).toBeNull();
  });

  it('배열로 와도 첫 행을 쓴다', () => {
    expect(
      withPersonalMemo({ ...createTestBook(), book_memos: [{ memo: 'a' }] })
        .personal_memo
    ).toBe('a');
  });
});
