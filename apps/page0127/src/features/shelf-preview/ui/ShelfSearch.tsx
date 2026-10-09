'use client';

import { useState } from 'react';

import { Button, CoverImage, Input } from '@repo/ui';
import { Check, Search } from 'lucide-react';

import { searchBooks } from '@/shared/api/book';

import { fromProviderBook } from '../model/toShelfPick';

import type { ShelfPick } from '../model/types';

type ShelfSearchProps = {
  /** 목록에서 이미 고른 책인지 — isbn 이 달라도 상품번호로 알아본다 */
  isSelected: (pick: ShelfPick) => boolean;
  /** 상한에 닿았으면 새로 고를 수 없다(이미 고른 책 빼기는 된다) */
  disabled: boolean;
  onPick: (pick: ShelfPick) => void;
};

type Status = 'idle' | 'loading' | 'done' | 'error';

/** 목록에 없는 책 — 기존 검색 API(로그인 없이 열려 있음, 레이트 리밋만)를 쓴다 */
export const ShelfSearch = ({
  isSelected,
  disabled,
  onPick,
}: ShelfSearchProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<ShelfPick[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setStatus('loading');
    try {
      const { items } = await searchBooks(q, { maxResults: 8 });
      setResults(items.map(fromProviderBook));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (!open) {
    return (
      <Button
        type='button'
        variant='outline'
        size='lg'
        onClick={() => setOpen(true)}
        className='mt-6 w-full gap-2'
      >
        <Search aria-hidden='true' className='size-4' />
        다른 책 찾아보기
      </Button>
    );
  }

  return (
    <div className='mt-4'>
      <form
        role='search'
        onSubmit={handleSubmit}
        className='flex max-w-md gap-2'
      >
        <Input
          aria-label='책 제목이나 저자'
          placeholder='책 제목이나 저자'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <Button type='submit' variant='outline' disabled={status === 'loading'}>
          <Search aria-hidden='true' className='size-4' />
          찾기
        </Button>
      </form>

      <div aria-live='polite' className='mt-3'>
        {status === 'loading' && (
          <p className='text-sm text-text-subtle'>찾는 중…</p>
        )}
        {status === 'error' && (
          <p className='text-sm text-text-subtle'>
            지금은 검색할 수 없어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {status === 'done' && results.length === 0 && (
          <p className='text-sm text-text-subtle'>검색 결과가 없어요.</p>
        )}
      </div>

      {results.length > 0 && (
        <ul className='mt-2 grid gap-2 sm:grid-cols-2'>
          {results.map((pick) => {
            const on = isSelected(pick);
            return (
              <li key={pick.book.isbn}>
                <button
                  type='button'
                  aria-pressed={on}
                  disabled={!on && disabled}
                  onClick={() => onPick(pick)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition disabled:opacity-40 ${
                    on ? 'border-primary' : 'border-line-soft hover:bg-sunken'
                  }`}
                >
                  <CoverImage
                    src={pick.coverSrc}
                    alt=''
                    width={36}
                    height={54}
                    className='h-13.5 w-9 shrink-0 rounded-sm object-cover'
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium text-text-strong'>
                      {pick.book.title}
                    </span>
                    <span className='block truncate text-xs text-text-subtle'>
                      {pick.book.author}
                    </span>
                  </span>
                  {on && (
                    <Check aria-hidden='true' className='size-4 text-primary' />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
