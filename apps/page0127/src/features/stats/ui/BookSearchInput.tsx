'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  /** 검색어 변경 핸들러 */
  onSearchChange: (query: string) => void;

  /** placeholder 텍스트 */
  placeholder?: string;
};

// 실험 2: 부모에게 노출할 메서드 타입을 명시적으로 정의
// DOM 전체를 노출하지 않고, 필요한 동작만 선택적으로 공개
export type BookSearchInputHandle = {
  focus: () => void;
  clear: () => void;
};

/**
 * 책 검색 Input 컴포넌트
 *
 * 학습 포인트:
 * - useImperativeHandle: ref로 노출할 메서드를 직접 정의
 * - forwardRef와 항상 함께 사용해야 함
 * - 내부 ref(inputRef)와 외부 ref(부모가 넘긴 ref)를 분리
 */
export const BookSearchInput = forwardRef<
  BookSearchInputHandle,
  BookSearchInputProps
>(({ onSearchChange, placeholder = '제목이나 저자로 검색하세요' }, ref) => {
  const [inputValue, setInputValue] = useState('');

  // 실제 DOM에 접근하기 위한 내부 ref (외부에 노출하지 않음)
  const inputRef = useRef<HTMLInputElement>(null);

  // useImperativeHandle: 부모의 ref에 이 객체를 연결
  // → 부모는 ref.current.focus(), ref.current.clear() 만 호출 가능
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      setInputValue('');
      onSearchChange('');
    },
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  return (
    <div className='relative'>
      <Input
        ref={inputRef}
        type='text'
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className='pl-10'
      />
      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
        🔍
      </div>
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
});

BookSearchInput.displayName = 'BookSearchInput';
