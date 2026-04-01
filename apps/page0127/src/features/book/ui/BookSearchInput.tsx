'use client';

import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  // React 19: ref가 일반 prop으로 승격 — forwardRef 래핑 불필요
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * 도서 검색 입력 컴포넌트
 *
 * 학습 포인트:
 * - React 19부터 ref를 일반 prop처럼 받을 수 있다
 * - forwardRef / displayName 보일러플레이트 제거됨
 */
export const BookSearchInput = ({
  onSearch,
  isLoading = false,
  ref,
}: BookSearchInputProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className='flex gap-2'>
      <Input
        ref={ref}
        type='text'
        placeholder='도서 제목으로 검색...'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
        className='flex-1'
      />
      <Button type='submit' disabled={isLoading || !query.trim()}>
        {isLoading ? '검색 중...' : '검색'}
      </Button>
    </form>
  );
};
