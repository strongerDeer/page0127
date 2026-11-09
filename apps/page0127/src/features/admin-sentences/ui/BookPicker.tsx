'use client';

import { useState } from 'react';

import { BookCover } from '@repo/ui';
import { Search } from 'lucide-react';

import { searchBooks } from '@/shared/api/book';

import { splitCredit } from '../model/splitCredit';

import type { ProviderBook } from '@/shared/api/book-provider';

export type PickedBook = {
  book_title: string;
  author: string;
  translator: string;
  isbn: string;
  cover_image: string;
};

const toPicked = (book: ProviderBook): PickedBook => ({
  book_title: book.title,
  ...splitCredit(book.author),
  isbn: book.isbn,
  cover_image: book.coverImage,
});

/**
 * 어드민 문장 폼의 책 검색 — 도서 추가 화면과 같은 검색(/api/books/search, YES24)을 쓴다.
 *
 * 검색창은 name 이 없다 — 바깥 server action 폼에 검색어가 실려 가지 않게.
 * Enter 도 폼 제출 대신 검색으로 바꾼다(안 그러면 문장 없이 "추가"가 눌린다).
 */
export const BookPicker = ({
  onPick,
}: {
  onPick: (book: PickedBook) => void;
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProviderBook[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { items } = await searchBooks(q, { maxResults: 8 });
      setResults(items);
    } catch {
      setError('검색하지 못했어요. 잠시 뒤 다시 해 주세요.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='rounded-md border border-dashed border-line p-3'>
      <div className='flex gap-2'>
        <input
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void search();
            }
          }}
          placeholder='책 제목·저자·ISBN 으로 찾기'
          aria-label='책 검색'
          className='w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm'
        />
        <button
          type='button'
          onClick={() => void search()}
          disabled={loading}
          className='inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-3 py-2 text-sm hover:bg-accent'
        >
          <Search className='size-4' aria-hidden />
          {loading ? '찾는 중…' : '찾기'}
        </button>
      </div>

      {error && <p className='mt-2 text-xs text-destructive'>{error}</p>}
      {results?.length === 0 && (
        <p className='mt-2 text-xs text-text-subtle'>
          찾는 책이 없어요. 아래 칸에 직접 적어도 돼요.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className='mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto'>
          {results.map((book) => (
            <li key={`${book.isbn}-${book.providerItemId ?? ''}`}>
              <button
                type='button'
                onClick={() => {
                  onPick(toPicked(book));
                  setResults(null);
                }}
                className='flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent'
              >
                <BookCover
                  src={book.coverImage || null}
                  title={book.title}
                  size='xs'
                  small
                  decorative
                />
                <span className='min-w-0'>
                  <span className='block truncate text-sm font-medium'>
                    {book.title}
                  </span>
                  <span className='block truncate text-xs text-text-subtle'>
                    {book.author} · {book.publisher} · {book.isbn}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
