'use client';

import { useEffect, useState } from 'react';

import { useDebounce } from '@/shared/lib/hooks/useDebounce';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  // React 19: ref가 일반 prop으로 승격 — forwardRef 래핑 불필요
  ref?: React.Ref<HTMLInputElement>;
};

const MAX_RECENT = 5;

/**
 * 도서 검색 입력 컴포넌트
 *
 * 학습 포인트:
 * - useDebounce: 타이핑 멈춘 후 400ms 뒤 자동 검색 → API 호출 횟수 절감
 * - useLocalStorage: 최근 검색어를 브라우저에 저장 → 새로고침해도 유지
 * - React 19부터 ref를 일반 prop처럼 받을 수 있다 (forwardRef 불필요)
 */
export const BookSearchInput = ({
  onSearch,
  isLoading = false,
  ref,
}: BookSearchInputProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // 최근 검색어: localStorage의 'book-recent-searches' 키에 저장
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    'book-recent-searches',
    []
  );

  // 타이핑 멈춘 후 400ms 뒤의 값 — 이 값이 바뀔 때만 API 호출
  const debouncedQuery = useDebounce(query, 400);

  // debouncedQuery가 바뀔 때마다 자동 검색
  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  const saveRecentSearch = (q: string) => {
    if (!q.trim()) return;
    // 중복 제거 후 맨 앞에 추가, MAX_RECENT개 유지
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item !== q);
      return [q, ...filtered].slice(0, MAX_RECENT);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    saveRecentSearch(query);
    onSearch(query);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
    onSearch(q);
    setIsFocused(false);
  };

  const showRecent =
    isFocused && !query && recentSearches.length > 0;

  return (
    <div className='relative'>
      <form onSubmit={handleSubmit} className='flex gap-2'>
        <Input
          ref={ref}
          type='text'
          placeholder='도서 제목으로 검색...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          disabled={isLoading}
          className='flex-1'
        />
        <Button type='submit' disabled={isLoading || !query.trim()}>
          {isLoading ? '검색 중...' : '검색'}
        </Button>
      </form>

      {/* 최근 검색어 드롭다운 */}
      {showRecent && (
        <ul className='absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-border bg-card shadow-sm'>
          {recentSearches.map((item) => (
            <li key={item}>
              <button
                type='button'
                onClick={() => handleRecentClick(item)}
                className='w-full px-4 py-2 text-left text-sm hover:bg-accent'
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
