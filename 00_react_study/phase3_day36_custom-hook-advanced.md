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
"use client"; // localStorage는 브라우저 전용 → Client Component에서만 동작

import { useCallback, useEffect, useState } from "react";

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
    [key, storedValue],
  );

  return [storedValue, setValue] as const; // as const → [T, Dispatch] 튜플 타입
};
```

---

### useDebounce

```typescript
// apps/page0127/src/shared/lib/hooks/useDebounce.ts
import { useEffect, useState } from "react";

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
    dispatch({ type: "SEARCH_CLEAR" });
    return;
  }
  dispatch({ type: "SEARCH_START", query, page });
  // ...aladin API 호출
};
```

### useDebounce 적용 아이디어

컴포넌트(BookSearchInput)에서:

```typescript
const [inputValue, setInputValue] = useState("");
const debouncedQuery = useDebounce(inputValue, 400); // 400ms 대기

useEffect(() => {
  search(debouncedQuery); // 타이핑 멈춘 후 400ms 뒤에만 검색
}, [debouncedQuery]);
```

### useLocalStorage 활용 아이디어

최근 검색어 저장:

```typescript
const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
  "book-recent-searches",
  [],
);
```

---

## 정리

| 훅                | 위치                   | 핵심 패턴                       | 언제 쓰나            |
| ----------------- | ---------------------- | ------------------------------- | -------------------- |
| `useDebounce`     | `shared/lib/hooks/`    | useEffect + clearTimeout        | 검색, resize, scroll |
| `useLocalStorage` | `shared/lib/hooks/`    | useState + JSON.parse/stringify | 설정, 최근 항목      |
| `useBookSearch`   | `features/book/api/`   | useReducer + 도메인 로직        | 특정 도메인 API      |
| `useCurrentUser`  | `entities/user/hooks/` | useQuery + 인증 상태            | 사용자 엔티티        |

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

## lodash debounce vs 커스텀 useDebounce

### lodash가 실무에서 많이 쓰이는 이유

실무에서 lodash를 쓰게 되는 건 **"함수 실행"을 디바운스**하는 상황입니다:

```typescript
// 이벤트 핸들러 디바운스
const handleResize = debounce(() => recalculateLayout(), 300);
window.addEventListener("resize", handleResize);

// 버튼 중복 클릭 방지 — leading 옵션으로 첫 클릭만 실행
const handleSubmit = debounce(submitForm, 500, {
  leading: true,
  trailing: false,
});
```

`leading`, `trailing`, `.cancel()`, `.flush()` 같은 세밀한 옵션이 필요할 때 lodash가 유용합니다.

### 커스텀 useDebounce가 맞는 경우

**"값"을 디바운스**하는 React state 기반 패턴:

```typescript
const debouncedQuery = useDebounce(inputValue, 400);

useEffect(() => {
  search(debouncedQuery); // 값이 안정화된 후 검색
}, [debouncedQuery]);
```

### lodash로 React state 디바운스 하려면

```typescript
// 보일러플레이트가 늘어남
const debouncedSearch = useRef(
  debounce((query: string) => onSearch(query), 400),
).current;

useEffect(() => {
  return () => debouncedSearch.cancel(); // 클린업도 수동
}, [debouncedSearch]);
```

`useDebounce` 훅은 이 보일러플레이트를 없애기 위해 만들어진 패턴입니다.

### 정리

| 상황                                      | 추천            |
| ----------------------------------------- | --------------- |
| `window` 이벤트, 외부 콜백 디바운스       | lodash          |
| 버튼 중복 클릭 방지 (`leading` 옵션 필요) | lodash          |
| React state 값 디바운스 (검색어 등)       | 커스텀 훅       |
| 팀에 lodash 이미 쓰고 있음                | lodash (일관성) |

**결론**: lodash가 잘못된 선택이 아니라 용도가 달랐던 것. React state 디바운스에는 커스텀 훅이 더 자연스럽다.

---

## 다음 Day 예고

**Day 37 — useMemo / useCallback 최적화**

- 렌더링 비용이 큰 연산을 메모이제이션
- 함수 참조 안정화로 불필요한 자식 리렌더 방지
- page0127에서 실제 최적화 포인트 찾기
