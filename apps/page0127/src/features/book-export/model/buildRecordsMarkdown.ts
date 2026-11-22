import { STATUS_LABEL } from './types';

import type { ExportBook, ExportQuote } from './types';
import type { BookStatus } from '@/entities/book';

/**
 * 내 기록을 Markdown 글로 만든다 — 사람이 읽고, 노션·옵시디언에 붙여 넣는 용도.
 *
 * CSV 와 나눈 이유: CSV 는 "다시 옮기기"(한 줄 = 한 권, 표 프로그램), Markdown 은
 * "읽고 간직하기"(메모·문장까지 한 문서). 문장은 책 한 권에 여러 개라 CSV 한 줄에 못 담는다.
 *
 * 구성: 읽는 중 → 완독(최근 순) → 읽고 싶음. 책마다 별점·날짜·한줄평·메모·모은 문장.
 */

const SECTION_ORDER: BookStatus[] = ['reading', 'completed', 'want_to_read'];

/**
 * 한 줄로 들어갈 글의 줄바꿈을 공백으로 접고, 줄 맨 앞에서 제목·목록으로 읽힐
 * 기호(# > - * 숫자.)를 글자로 바꾼다.
 */
const inline = (text: string): string =>
  text
    .replace(/\s*\r?\n\s*/g, ' ')
    .trim()
    .replace(/^([#>*+-]|\d+\.)/, '\\$1');

/** 여러 줄 글을 인용 블록으로 — 빈 줄도 `>` 를 붙여야 인용이 끊기지 않는다 */
const quoteBlock = (text: string): string =>
  text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `> ${line.trimEnd()}` : '>'))
    .join('\n');

const stars = (rating: number | null): string | null =>
  rating && rating > 0 ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : null;

/** 완독일 우선, 없으면 연도, 그것도 없으면 등록일 — 최근 읽은 책을 위로 올리는 정렬 키 */
const sortKey = (book: ExportBook): string =>
  book.completed_date ||
  (book.completed_year ? `${book.completed_year}-00-00` : '') ||
  book.created_at;

const dateLine = (book: ExportBook): string | null => {
  const done =
    book.completed_date ??
    (book.completed_year ? `${book.completed_year}년` : null);
  if (book.start_date && done) return `${book.start_date} ~ ${done}`;
  if (done) return `${done} 완독`;
  if (book.start_date) return `${book.start_date} 시작`;
  return null;
};

const renderQuotes = (quotes: ExportQuote[]): string[] =>
  quotes.flatMap((q) => [
    quoteBlock(q.page ? `${q.text}\n— ${q.page}쪽` : q.text),
    '',
  ]);

const renderBook = (book: ExportBook, quotes: ExportQuote[]): string[] => {
  const author = book.author ? ` — ${inline(book.author)}` : '';
  const reread = book.read_count > 1 ? ` (${book.read_count}회독)` : '';
  const meta = [
    stars(book.rating),
    book.is_life_book ? '인생책' : null,
    dateLine(book),
    book.is_public ? null : '비공개',
  ].filter(Boolean);

  const lines = [`### ${inline(book.title)}${author}${reread}`, ''];
  if (meta.length) lines.push(meta.join(' · '), '');
  if (book.one_line_review)
    lines.push(`**한줄평** ${inline(book.one_line_review)}`, '');
  if (book.tags?.length)
    lines.push(`태그: ${book.tags.map((t) => `#${t}`).join(' ')}`, '');
  if (book.personal_memo?.trim())
    lines.push('**메모**', '', book.personal_memo.trim(), '');
  if (quotes.length) lines.push('**간직한 문장**', '', ...renderQuotes(quotes));
  return lines;
};

export const buildRecordsMarkdown = ({
  books,
  quotes,
  exportedOn,
}: {
  books: ExportBook[];
  quotes: ExportQuote[];
  /** YYYY-MM-DD (한국 날짜) */
  exportedOn: string;
}): string => {
  // 문장은 책 기록이 아니라 ISBN 에 붙는다 — 재독으로 같은 책이 여러 줄이면 첫 줄에만 단다
  const quotesByIsbn = new Map<string, ExportQuote[]>();
  for (const q of [...quotes].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  )) {
    quotesByIsbn.set(q.isbn, [...(quotesByIsbn.get(q.isbn) ?? []), q]);
  }
  const usedIsbns = new Set<string>();
  const takeQuotes = (isbn: string): ExportQuote[] => {
    if (usedIsbns.has(isbn)) return [];
    usedIsbns.add(isbn);
    return quotesByIsbn.get(isbn) ?? [];
  };

  const lines = [
    '# page0127. 독서 기록',
    '',
    `> ${exportedOn} 내보냄 · 책 ${books.length}권 · 문장 ${quotes.length}개`,
    '',
  ];

  for (const status of SECTION_ORDER) {
    const group = books
      .filter((b) => b.status === status)
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
    if (group.length === 0) continue;
    lines.push(`## ${STATUS_LABEL[status]} (${group.length})`, '');
    for (const book of group)
      lines.push(...renderBook(book, takeQuotes(book.isbn)));
  }

  // 책 기록은 지웠지만 문장은 남아 있는 경우 — 버리지 않고 따로 모은다
  const orphans = quotes.filter((q) => !usedIsbns.has(q.isbn));
  if (orphans.length) {
    lines.push('## 책 기록이 없는 문장', '', ...renderQuotes(orphans));
  }

  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
};
