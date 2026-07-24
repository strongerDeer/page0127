'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * localStorage를 React 상태처럼 쓰는 훅 (SSR 안전)
 *
 * ⚠️ 하이드레이션 문제와 해법:
 * 서버(SSR)엔 localStorage가 없다. 첫 렌더에서 저장값을 읽어버리면
 * 서버(기본값)와 클라이언트(저장값)의 HTML이 달라져 hydration mismatch가 난다.
 *
 * → useSyncExternalStore를 쓰면, 서버 스냅샷은 항상 initialValue를 주고
 *   클라이언트는 hydration이 끝난 뒤 localStorage 값으로 자연스럽게 전환된다.
 *   이건 React가 외부 저장소 구독을 위해 공식 지원하는 API라, effect에서
 *   setState를 호출하지 않고도 mismatch 경고 없이 안전하다.
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // 다른 탭에서의 변경('storage' 이벤트)을 구독 → 변경되면 리렌더
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener('storage', onStoreChange);
    return () => window.removeEventListener('storage', onStoreChange);
  }, []);

  // getSnapshot은 "값이 같으면 같은 참조"를 반환해야 무한 루프가 안 난다.
  // 원본 문자열을 캐시해, 문자열이 바뀔 때만 새로 파싱한다 (배열·객체도 안전).
  const cache = useRef<{ raw: string | null; value: T }>({
    raw: null,
    value: initialValue,
  });

  const getSnapshot = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== cache.current.raw) {
        cache.current = {
          raw,
          value: raw !== null ? (JSON.parse(raw) as T) : initialValue,
        };
      }
      return cache.current.value;
    } catch {
      return initialValue;
    }
  };

  // 서버 렌더: localStorage가 없으니 항상 initialValue → hydration 일치의 핵심
  const getServerSnapshot = (): T => initialValue;

  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // 함수형 업데이트 지원: setValue(prev => [...prev, newItem])
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // 'storage' 이벤트는 "다른 탭"에서만 발생한다 → 같은 탭도 리렌더되도록 직접 발행
        window.dispatchEvent(new StorageEvent('storage', { key }));
      } catch (error) {
        console.warn(`useLocalStorage: key "${key}" 저장 실패`, error);
      }
    },
    [key, storedValue]
  );

  // as const → 튜플 타입 [T, (value) => void] 고정
  return [storedValue, setValue] as const;
};
