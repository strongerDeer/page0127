'use client';

import { forwardRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  onSearch: (query: string) => void;
  isLoading?: boolean;
};

/**
 * 도서 검색 입력 컴포넌트
 *
 * 학습 포인트:
 * - forwardRef: 부모가 이 컴포넌트 내부의 <input> DOM에 접근할 수 있게 해줌
 * - 제네릭 타입: forwardRef<전달할 DOM 타입, Props 타입>
 * - displayName: React DevTools에서 컴포넌트 이름이 보이도록 설정
 */
export const BookSearchInput = forwardRef<
  HTMLInputElement,
  BookSearchInputProps
>(({ onSearch, isLoading = false }, ref) => {
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
});

BookSearchInput.displayName = 'BookSearchInput';
