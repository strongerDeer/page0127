import { groupQuotesByBook } from '../model/quoteShelf';

import type { QuoteShelfBook, QuoteShelfGroup } from '../model/quoteShelf';
import type { BookQuote } from '../model/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 문장 서랍 "내가 적은 문장" — 내 문장 전부를 책별로 묶어서.
 *
 * 문장은 (user_id, isbn) 에 걸려 있고 books.id 를 모른다(회독마다 기록이 따로라서).
 * 그래서 두 번 묻는다: 문장 전부 → 그 ISBN 들의 내 책 기록(제목·표지·상세 링크용).
 * RLS 가 두 테이블 모두 본인 행만 열어 주지만 user_id 도 직접 건다.
 *
 * 실패하면 빈 배열 — 화면은 빈 상태 안내를 보여 준다.
 */
export const getQuoteShelf = async (
  client: SupabaseClient,
  userId: string
): Promise<QuoteShelfGroup[]> => {
  const { data: quotes, error } = await client
    .from('book_quotes')
    .select('id, isbn, text, page, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .returns<BookQuote[]>();

  if (error) {
    console.error('문장 서랍 조회 실패:', error.message);
    return [];
  }
  if (!quotes?.length) return [];

  const isbns = [...new Set(quotes.map((q) => q.isbn))];
  const { data: books, error: booksError } = await client
    .from('books')
    .select('id, isbn, title, author, cover_image, created_at')
    .eq('user_id', userId)
    .in('isbn', isbns)
    .returns<QuoteShelfBook[]>();

  // 책 정보가 없어도 문장은 보여 준다 — 제목 자리에 "지운 책" 안내가 나온다
  if (booksError) {
    console.error('문장 서랍 책 정보 조회 실패:', booksError.message);
  }

  return groupQuotesByBook(quotes, books ?? []);
};
