import { describe, expect, it } from 'vitest';

import { safeSourceUrl, validateManualBook } from './review';

describe('직접 등록 도서 입력', () => {
  const base = { title: ' 책 제목 ', author: ' 저자 ', publisher: '' };
  it('ISBN 없는 도서는 허용하고 제목·저자 공백을 정리한다', () => {
    expect(validateManualBook(base)).toMatchObject({
      title: '책 제목',
      author: '저자',
      isbn: '',
      source_url: null,
    });
  });
  it('ISBN이 없는 책의 내부 식별자는 UUID 형태 그대로 유지한다', () => {
    const isbn = 'manual:12345678-0000-0000-0000-000000000000';
    expect(validateManualBook({ ...base, isbn }).isbn).toBe(isbn);
  });
  it('ISBN 체크섬과 선택한 출처를 검증한다', () => {
    expect(
      validateManualBook({
        ...base,
        isbn: '978-89-364-3412-0',
        source_url: 'https://publisher.example/book',
      }).isbn
    ).toBe('9788936434120');
    expect(() =>
      validateManualBook({ ...base, isbn: '9780000000000' })
    ).toThrow(/ISBN/);
  });
  it.each([
    'javascript:alert(1)',
    'http://example.com',
    'https://user:secret@example.com',
  ])('위험한 출처 %s를 거부한다', (source_url) => {
    expect(() => validateManualBook({ ...base, source_url })).toThrow();
    expect(safeSourceUrl(source_url)).toBeNull();
  });
  it('제목·저자 누락과 과도한 길이를 거절한다', () => {
    expect(() => validateManualBook({ ...base, author: ' ' })).toThrow();
    expect(() =>
      validateManualBook({ ...base, title: 'a'.repeat(201) })
    ).toThrow();
  });
});
