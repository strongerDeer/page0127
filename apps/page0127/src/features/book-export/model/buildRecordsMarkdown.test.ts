import { describe, expect, it } from 'vitest';

import { buildRecordsMarkdown } from './buildRecordsMarkdown';

import type { ExportBook, ExportQuote } from './types';

const book = (overrides: Partial<ExportBook> = {}): ExportBook => ({
  isbn: '9788937460449',
  title: '데미안',
  author: '헤르만 헤세',
  publisher: null,
  status: 'completed',
  read_count: 1,
  start_date: null,
  completed_date: '2024-03-05',
  completed_year: null,
  rating: 4,
  is_life_book: false,
  one_line_review: null,
  personal_memo: null,
  tags: null,
  is_public: true,
  created_at: '2024-03-05T00:00:00.000Z',
  ...overrides,
});

const quote = (overrides: Partial<ExportQuote> = {}): ExportQuote => ({
  isbn: '9788937460449',
  text: '새는 알을 깨고 나온다.',
  page: 123,
  created_at: '2024-03-05T00:00:00.000Z',
  ...overrides,
});

const build = (books: ExportBook[], quotes: ExportQuote[] = []) =>
  buildRecordsMarkdown({ books, quotes, exportedOn: '2026-11-22' });

describe('buildRecordsMarkdown', () => {
  it('맨 위에 내보낸 날과 권수·문장 수를 적는다', () => {
    expect(build([book()], [quote()])).toContain(
      '> 2026-11-22 내보냄 · 책 1권 · 문장 1개'
    );
  });

  it('읽는 중 → 완독 → 읽고 싶음 순으로 묶고, 완독은 최근 순이다', () => {
    const md = build([
      book({ title: '옛날 책', completed_date: '2020-01-01' }),
      book({
        title: '읽고 싶은 책',
        status: 'want_to_read',
        completed_date: null,
      }),
      book({ title: '최근 책', completed_date: '2025-01-01' }),
      book({ title: '읽는 책', status: 'reading', completed_date: null }),
    ]);
    const order = [
      '## 읽는 중 (1)',
      '### 읽는 책',
      '## 완독 (2)',
      '### 최근 책',
      '### 옛날 책',
      '## 읽고 싶음 (1)',
    ];
    const positions = order.map((s) => md.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('별점·인생책·날짜·비공개를 한 줄로 적는다', () => {
    const md = build([
      book({ is_life_book: true, start_date: '2024-03-01', is_public: false }),
    ]);
    expect(md).toContain('★★★★☆ · 인생책 · 2024-03-01 ~ 2024-03-05 · 비공개');
  });

  it('문장은 쪽수와 함께 인용으로, 재독한 책은 첫 기록에만 단다', () => {
    const md = build(
      [book({ read_count: 2, completed_date: '2025-01-01' }), book()],
      [quote()]
    );
    expect(md.match(/> 새는 알을 깨고 나온다\./g)).toHaveLength(1);
    expect(md).toContain('> — 123쪽');
    expect(md).toContain('### 데미안 — 헤르만 헤세 (2회독)');
  });

  it('책 기록을 지운 문장도 버리지 않고 따로 모은다', () => {
    const md = build([book()], [quote({ isbn: 'other', text: '남은 문장' })]);
    expect(md).toContain('## 책 기록이 없는 문장');
    expect(md).toContain('> 남은 문장');
  });

  it('제목 맨 앞의 # 는 제목 기호로 읽히지 않게 글자로 바꾼다', () => {
    expect(build([book({ title: '#해시태그 책' })])).toContain(
      '### \\#해시태그 책'
    );
  });
});
