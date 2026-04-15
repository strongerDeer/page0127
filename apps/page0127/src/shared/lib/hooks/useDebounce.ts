'use client';

import { useEffect, useState } from 'react';

// 연속으로 바뀌는 값의 "마지막 값"만 사용할 때 쓰는 훅
// 대표적인 사용처: 검색 입력 (타이핑할 때마다 API 호출 방지)
export const useDebounce = <T>(value: T, delay = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // delay ms 후에 값을 업데이트하는 타이머 등록
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    // 클린업: value가 바뀌면 이전 타이머를 취소 → 마지막 값만 반영
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};
