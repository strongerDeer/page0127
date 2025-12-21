'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  /** 검색어 변경 핸들러 */
  onSearchChange: (query: string) => void;

  /** placeholder 텍스트 */
  placeholder?: string;
};

/**
 * 책 검색 Input 컴포넌트
 *
 * 학습 포인트:
 * - Debouncing: 사용자 입력이 멈춘 후 300ms 후에 검색 실행
 * - useEffect cleanup: 이전 타이머 정리하여 성능 최적화
 * - 제목/저자 통합 검색
 *
 * @example
 * <BookSearchInput
 *   onSearchChange={(query) => setSearchQuery(query)}
 *   placeholder="제목이나 저자로 검색하세요"
 * />
 */
export const BookSearchInput = ({
  onSearchChange,
  placeholder = '제목이나 저자로 검색하세요',
}: BookSearchInputProps) => {
  // 입력 중인 검색어 (즉시 반영)
  const [inputValue, setInputValue] = useState('');

  // Debouncing: 입력이 멈춘 후 300ms 후에 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);

    // cleanup: 이전 타이머 제거 (성능 최적화)
    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  return (
    <div className='relative'>
      <Input
        type='text'
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className='pl-10'
      />
      {/* 검색 아이콘 */}
      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
        🔍
      </div>
      {/* 검색어가 있으면 X 버튼 표시 */}
      {inputValue && (
        <button
          type='button'
          onClick={() => setInputValue('')}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
        >
          ✕
        </button>
      )}
    </div>
  );
};
