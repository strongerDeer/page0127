'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { ScanBarcode } from 'lucide-react';

import { useDebounce } from '@/shared/lib/hooks/useDebounce';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';
import { useRotatingPlaceholder } from '@/shared/lib/hooks/useRotatingPlaceholder';

import {
  PLACEHOLDER_ROTATION_MS,
  SEARCH_PLACEHOLDERS,
} from '@/features/book/model/searchPlaceholders';

type BookSearchInputProps = {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  /** 있으면 검색창 옆에 바코드 버튼을 보여 준다 */
  onScanClick?: () => void;
  /** 처음 채워 둘 검색어 — 바코드로 읽은 ISBN 을 보여 줄 때 쓴다(바꾸려면 key 로 다시 마운트) */
  initialQuery?: string;
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
  onScanClick,
  initialQuery = '',
  ref,
}: BookSearchInputProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);

  // 최근 검색어: localStorage의 'book-recent-searches' 키에 저장
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    'book-recent-searches',
    []
  );

  // 타이핑 멈춘 후 400ms 뒤의 값 — 이 값이 바뀔 때만 API 호출
  const debouncedQuery = useDebounce(query, 400);

  // useEffectEvent: onSearch 는 "부를 함수"일 뿐 "다시 검색할 이유"가 아니다.
  // 예전엔 onSearch 를 effect 의존성에 넣어서, 부모가 렌더마다 새 함수를 내려주면
  // 검색 → 부모 리렌더(검색 중 상태) → 새 onSearch → effect 재실행 → 또 검색…
  // 으로 같은 검색어 요청이 끝없이 나갔다(429 폭주). 부모가 useCallback 을 깜빡해도
  // (React Compiler 가 try/finally 등으로 그 컴포넌트를 건너뛰어도) 안전하도록,
  // 항상 최신 onSearch 를 부르되 effect 는 검색어가 바뀔 때만 돈다.
  const runSearch = useEffectEvent((q: string) => onSearch(q));

  // debouncedQuery가 바뀔 때만 자동 검색
  useEffect(() => {
    if (debouncedQuery.trim()) {
      runSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

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

  const showRecent = isFocused && !query && recentSearches.length > 0;

  // 검색창 힌트가 회전한다 — 교보문고처럼 실제 책 제목이 돈다.
  // 사용자가 입력하려고 포커스한 동안에는 멈춘다(방해가 되므로).
  const placeholder = useRotatingPlaceholder(SEARCH_PLACEHOLDERS, {
    paused: isFocused || !!query,
    intervalMs: PLACEHOLDER_ROTATION_MS,
  });

  return (
    <div className='relative'>
      <form onSubmit={handleSubmit} className='flex gap-2'>
        {/*
          입력창에는 disabled 를 걸지 않는다.
          400ms 디바운스 자동 검색이 타이핑 도중에 걸리는데, 그때 input 이 disabled 가 되면
          브라우저가 포커스를 강제로 떼어낸다(그리고 다시 돌려주지 않는다).
          → 사용자 체감: "치다가 멈추고 포커스가 사라진다".
          로딩 표시는 버튼에서만 한다.
        */}
        <Input
          ref={ref}
          type='text'
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          className='flex-1'
        />
        {onScanClick && (
          <Button
            type='button'
            variant='outline'
            size='icon-md'
            onClick={onScanClick}
            aria-label='바코드로 책 찾기'
            title='바코드로 책 찾기'
          >
            <ScanBarcode aria-hidden />
          </Button>
        )}
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
