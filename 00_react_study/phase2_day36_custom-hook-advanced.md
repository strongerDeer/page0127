# Day 36 — Custom Hook 심화: useLocalStorage / useDebounce

## 오늘 읽을 코드

- [useCurrentUser.ts](../apps/page0127/src/entities/user/hooks/useCurrentUser.ts)
- [useBookSearch.ts](../apps/page0127/src/features/book/api/useBookSearch.ts)

---

## 핵심 개념

### Custom Hook이란?

`use`로 시작하는 함수로, React Hook을 내부에서 사용하는 **로직 캡슐화 단위**.

```typescript
// ✅ 이게 Custom Hook의 본질
// - 로직은 훅이 담당
// - 컴포넌트는 UI만 담당
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer); // 클린업: 연속 입력 시 이전 타이머 취소
  }, [value, delay]);

  return debouncedValue;
};
```

---

### 왜 `shared/` 레이어에 두는가?

FSD 구조에서 `shared/`는 **의존성이 없는 범용 레이어**.

```
shared/
  lib/
    hooks/          ← 오늘 만들 위치
      useDebounce.ts
      useLocalStorage.ts
  ui/
  api/
```

- `entities/`, `features/`는 서비스 도메인(책, 사용자)에 특화
- `shared/hooks/`는 **도메인 무관한 재사용 로직** → 어디서나 import 가능

---

### useLocalStorage

```typescript
// apps/page0127/src/shared/lib/hooks/useLocalStorage.ts
'use client'; // localStorage는 브라우저 전용 → Client Component에서만 동작

import { useCallback, useEffect, useState } from 'react';

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // 1. 초기값: localStorage에 있으면 그 값, 없으면 initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // 2. 값 변경 시 localStorage 동기화
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // 함수형 업데이트 지원 (useState와 동일한 인터페이스)
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

  return [storedValue, setValue] as const; // as const → [T, Dispatch] 튜플 타입
};
```

---

### useDebounce

```typescript
// apps/page0127/src/shared/lib/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

// 검색 입력처럼 "연속 변경 중 마지막 값만" 사용할 때
export const useDebounce = <T>(value: T, delay = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    // 클린업: value가 바뀌면 이전 타이머 취소 → 마지막 입력만 반영
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};
```

---

## page0127 실제 코드 사례

### 현재 구조 (개선 전)

`useBookSearch`에서 검색어 디바운스가 없어 타이핑할 때마다 API 호출:

```typescript
// useBookSearch.ts:93
const search = async (query: string, page = 1) => {
  if (!query.trim()) {
    dispatch({ type: 'SEARCH_CLEAR' });
    return;
  }
  dispatch({ type: 'SEARCH_START', query, page });
  // ...aladin API 호출
};
```

### useDebounce 적용 아이디어

컴포넌트(BookSearchInput)에서:

```typescript
const [inputValue, setInputValue] = useState('');
const debouncedQuery = useDebounce(inputValue, 400); // 400ms 대기

useEffect(() => {
  search(debouncedQuery); // 타이핑 멈춘 후 400ms 뒤에만 검색
}, [debouncedQuery]);
```

### useLocalStorage 활용 아이디어

최근 검색어 저장:

```typescript
const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
  'book-recent-searches',
  []
);
```

---

## 정리

| 훅 | 위치 | 핵심 패턴 | 언제 쓰나 |
|---|---|---|---|
| `useDebounce` | `shared/lib/hooks/` | useEffect + clearTimeout | 검색, resize, scroll |
| `useLocalStorage` | `shared/lib/hooks/` | useState + JSON.parse/stringify | 설정, 최근 항목 |
| `useBookSearch` | `features/book/api/` | useReducer + 도메인 로직 | 특정 도메인 API |
| `useCurrentUser` | `entities/user/hooks/` | useQuery + 인증 상태 | 사용자 엔티티 |

**규칙**: 도메인 없는 로직 → `shared/`, 도메인 있는 로직 → `entities/` 또는 `features/`

---

## 오늘 실험

### 실험 1 — useDebounce 직접 만들기

```bash
mkdir -p apps/page0127/src/shared/lib/hooks
touch apps/page0127/src/shared/lib/hooks/useDebounce.ts
```

위의 `useDebounce` 코드를 직접 타이핑하고, delay를 300 / 1000으로 바꿔가며 동작 확인.

### 실험 2 — useLocalStorage 만들고 DevTools 확인

```bash
touch apps/page0127/src/shared/lib/hooks/useLocalStorage.ts
```

코드 작성 후 브라우저 DevTools > Application > Local Storage에서 값이 저장/삭제되는지 확인.

---

## 다음 Day 예고

**Day 37 — useMemo / useCallback 최적화**
- 렌더링 비용이 큰 연산을 메모이제이션
- 함수 참조 안정화로 불필요한 자식 리렌더 방지
- page0127에서 실제 최적화 포인트 찾기
