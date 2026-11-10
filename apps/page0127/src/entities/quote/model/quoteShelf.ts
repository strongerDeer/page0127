import type { BookQuote } from './types';

/** 보관함에서 문장 묶음 위에 띄우는 책 — 그 ISBN 의 내 최신 기록에서 */
export type QuoteShelfBook = {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  cover_image: string | null;
  created_at: string;
};

/** 문장 서랍 "내가 적은 문장" 한 묶음 — 책 한 권과 그 책에서 적은 문장들 */
export type QuoteShelfGroup = {
  isbn: string;
  /** 책 기록을 모두 지웠으면 null — 문장만 남는다(문장은 기록과 따로 산다) */
  book: QuoteShelfBook | null;
  /** 적은 순서대로 */
  quotes: BookQuote[];
  /** 이 책에 마지막으로 문장을 적은 때 — 묶음 정렬 기준 */
  lastQuotedAt: string;
};

/**
 * 문장을 책(ISBN)별로 묶는다.
 *
 * - 묶음 순서: 최근에 문장을 적은 책이 위. 오늘 밑줄 친 책을 먼저 찾게 된다.
 * - 묶음 안: 적은 순서(오래된 것 위) — 책을 읽어 나간 순서와 같다.
 * - 같은 ISBN 기록이 여러 개(회독)면 가장 최근 기록을 책 정보로 쓴다.
 *   RPC random_book_quote 와 같은 규칙이다.
 */
export const groupQuotesByBook = (
  quotes: readonly BookQuote[],
  books: readonly QuoteShelfBook[]
): QuoteShelfGroup[] => {
  const latestBook = new Map<string, QuoteShelfBook>();
  for (const book of books) {
    const prev = latestBook.get(book.isbn);
    if (!prev || book.created_at > prev.created_at) {
      latestBook.set(book.isbn, book);
    }
  }

  const groups = new Map<string, QuoteShelfGroup>();
  for (const quote of quotes) {
    const group = groups.get(quote.isbn) ?? {
      isbn: quote.isbn,
      book: latestBook.get(quote.isbn) ?? null,
      quotes: [],
      lastQuotedAt: quote.created_at,
    };
    group.quotes.push(quote);
    if (quote.created_at > group.lastQuotedAt) {
      group.lastQuotedAt = quote.created_at;
    }
    groups.set(quote.isbn, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      quotes: [...group.quotes].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      ),
    }))
    .sort((a, b) => b.lastQuotedAt.localeCompare(a.lastQuotedAt));
};
