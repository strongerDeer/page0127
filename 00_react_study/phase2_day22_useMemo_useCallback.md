# Day 22 — useMemo / useCallback

## 오늘 읽을 코드

- [DashboardBookList.tsx](apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — `filteredBooks` 계산 로직 (140–201번째 줄)
- [DashboardContent.tsx](apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — 핸들러 함수들 (306–331번째 줄)

---

## 핵심 개념

### useMemo — 계산 결과 캐싱

```tsx
// 렌더링마다 새로 계산 (현재 코드)
const filteredBooks = books.filter(...).sort(...);

// useMemo: deps가 바뀔 때만 재계산
const filteredBooks = useMemo(() => {
  return books.filter(...).sort(...);
}, [books, selectedMonth, selectedCategory, selectedRating, searchQuery, sortOption, statusFilter]);
```

**언제 쓰나**: 배열 filter/sort처럼 비용이 있는 계산 + 결과를 자식에게 prop으로 내려줄 때

---

### useCallback — 함수 참조 캐싱

```tsx
// 렌더링마다 새 함수 생성 (현재 코드)
const handleMonthClick = (month: number) =>
  filterDispatch({ type: 'TOGGLE_MONTH', month });

// useCallback: deps가 바뀔 때만 새 함수 참조 생성
const handleMonthClick = useCallback(
  (month: number) => filterDispatch({ type: 'TOGGLE_MONTH', month }),
  [filterDispatch]  // dispatch는 항상 동일 참조 → 사실상 한 번만 생성
);
```

**언제 쓰나**: 함수를 `React.memo`로 감싼 자식에게 prop으로 내려줄 때, 또는 `useEffect`의 deps에 함수가 들어갈 때

---

## page0127 실제 코드 사례

### 사례 1: `filteredBooks` — useMemo 적용 전/후

**현재 코드** ([DashboardBookList.tsx:140](apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L140)):
```tsx
// 렌더링마다 books 전체를 filter + sort — 책이 많을수록 비용 증가
const filteredBooks = books
  .filter((book) => { ... })
  .sort((a, b) => { ... });
```

**useMemo 적용 후**:
```tsx
import { useMemo, useState } from 'react';

const filteredBooks = useMemo(() => {
  return books
    .filter((book) => {
      if (statusFilter !== 'all' && book.status !== statusFilter) return false;
      if (selectedMonth !== null && book.completed_date) {
        const bookMonth = new Date(book.completed_date).getMonth() + 1;
        if (bookMonth !== selectedMonth) return false;
      }
      if (selectedCategory !== null) {
        if (mapToMainCategory(book.category) !== selectedCategory) return false;
      }
      if (selectedRating !== null && book.rating !== selectedRating) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!book.title.toLowerCase().includes(q) &&
            !(book.author?.toLowerCase().includes(q) ?? false)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const [field, order] = sortOption.split('-');
      if (field === 'created_at') {
        return order === 'desc'
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (field === 'rating') {
        return order === 'desc' ? (b.rating ?? 0) - (a.rating ?? 0) : (a.rating ?? 0) - (b.rating ?? 0);
      }
      if (field === 'title') {
        return order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      return 0;
    });
}, [books, selectedMonth, selectedCategory, selectedRating, searchQuery, sortOption, statusFilter]);
```

→ `sortOption` 변경 시에만 이전 정렬이 재실행, 나머지 상태 변경(예: 페이지 이동)엔 캐시 반환

---

### 사례 2: 핸들러 — useCallback 적용 전/후

**현재 코드** ([DashboardContent.tsx:306](apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L306)):
```tsx
// 매 렌더링마다 새 함수 참조 생성
const handleMonthClick = (month: number) =>
  filterDispatch({ type: 'TOGGLE_MONTH', month });

const handlePreviousMonth = () => calendarDispatch({ type: 'PREV_MONTH' });
const handleNextMonth = () => calendarDispatch({ type: 'NEXT_MONTH' });
```

**useCallback 적용 후**:
```tsx
const handleMonthClick = useCallback(
  (month: number) => filterDispatch({ type: 'TOGGLE_MONTH', month }),
  [filterDispatch]
);

const handlePreviousMonth = useCallback(
  () => calendarDispatch({ type: 'PREV_MONTH' }),
  [calendarDispatch]
);
```

> `useReducer`의 `dispatch`는 항상 동일 참조 → deps에 넣어도 재생성 없음

---

## 정리

| Hook | 캐싱 대상 | 재실행 조건 | 주 용도 |
|------|-----------|------------|---------|
| `useMemo` | 계산 **결과값** | deps 변경 시 | filter/sort 등 비용 있는 계산 |
| `useCallback` | **함수 참조** | deps 변경 시 | memo 자식에 prop 전달, useEffect deps |

**규칙 1줄**: useMemo는 "값", useCallback은 "함수" — 둘 다 deps가 바뀔 때만 재생성한다.

---

## 오늘 실험

### 실험 1: filteredBooks에 useMemo 적용하기

`DashboardBookList.tsx`에서 `filteredBooks` 계산에 `useMemo`를 감싸본다.

```tsx
// 1. import 수정
import { useEffect, useMemo, useRef, useState } from 'react';

// 2. filteredBooks 를 useMemo로 감싸기
const filteredBooks = useMemo(() => {
  return books.filter(/* ... */).sort(/* ... */);
}, [books, selectedMonth, selectedCategory, selectedRating, searchQuery, sortOption, statusFilter]);
```

React DevTools Profiler에서 카테고리 필터 클릭 전/후 렌더링 시간을 비교해본다.

---

### 실험 2: useCallback이 "효과 없는" 경우 확인하기

```tsx
// ❌ 이렇게 하면 useCallback 의미 없음 — 자식이 React.memo가 아니면 어차피 리렌더
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);
```

`DashboardContent.tsx`에서 `handleCopyPublicUrl`에 useCallback을 달아보고,
전달 받는 컴포넌트가 `React.memo`로 감싸져 있지 않으면 렌더 횟수가 줄지 않는다는 걸 Profiler로 확인해본다.

---

## 다음 Day 예고

**Day 23 — useRef 심화**: DOM ref vs 값 보관 ref 구분, `useImperativeHandle`로 부모에서 자식 메서드 호출 (`BookSearchInput`의 `clear()` 패턴)
