'use client';

import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Input } from '@/shared/ui/input';

type BookSearchInputProps = {
  /** 검색어 변경 핸들러 */
  onSearchChange: (query: string) => void;

  /** placeholder 텍스트 */
  placeholder?: string;

  // React 19: ref를 일반 prop으로 받음
  // useImperativeHandle과 함께 쓸 때는 노출할 메서드 타입을 ref에 지정
  ref?: React.Ref<BookSearchInputHandle>;
};

// 부모에게 노출할 메서드 타입 — DOM 전체 대신 필요한 동작만 공개
export type BookSearchInputHandle = {
  focus: () => void;
  clear: () => void;
};

/**
 * 책 검색 Input 컴포넌트
 *
 * 학습 포인트:
 * - React 19: forwardRef 없이 ref를 prop으로 받는다
 * - useImperativeHandle: 부모의 ref에 연결할 메서드를 직접 정의
 * - 내부 inputRef(DOM 접근용)와 외부 ref(메서드 노출용)를 분리
 */
export const BookSearchInput = ({
  onSearchChange,
  placeholder = '제목이나 저자로 검색하세요',
  ref,
}: BookSearchInputProps) => {
  const [inputValue, setInputValue] = useState('');

  // 실제 DOM에 접근하기 위한 내부 ref (외부에 노출하지 않음)
  const inputRef = useRef<HTMLInputElement>(null);

  // 부모의 ref.current에 이 객체를 연결 — focus/clear만 노출
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
};
