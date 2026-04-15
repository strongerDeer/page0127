'use client';

import { useCallback, useState } from 'react';

// localStorage를 React 상태처럼 쓸 수 있게 해주는 훅
// useState와 동일한 인터페이스: [value, setValue]
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // 초기값: localStorage에 저장된 값이 있으면 그걸 씀, 없으면 initialValue
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // 함수형 업데이트 지원: setValue(prev => [...prev, newItem])
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`useLocalStorage: key "${key}" 저장 실패`, error);
      }
    },
    [key, storedValue]
  );

  // as const → 튜플 타입 [T, (value) => void] 고정
  return [storedValue, setValue] as const;
};
