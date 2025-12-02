'use client';

import { useState } from 'react';

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
 * - 제어 컴포넌트 (Controlled Component) 패턴
 * - onSubmit 이벤트 처리
 * - Props를 통한 부모-자식 간 통신
 */
export const BookSearchInput = ({
  onSearch,
  isLoading = false,
}: BookSearchInputProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // 페이지 새로고침 방지
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className='flex gap-2'>
      <Input
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
