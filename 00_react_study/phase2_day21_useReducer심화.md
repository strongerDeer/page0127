# Day 21 — useReducer 심화: 필터 초기화 + URL 동기화

## 오늘 읽을 코드

- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — filterReducer, 4개 필터 상태
- [PublicLibraryContent.tsx](../apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx) — TODO: 필터 미구현 상태
- [PublicLibraryFilter.tsx](../apps/page0127/src/features/public-library/ui/PublicLibraryFilter.tsx) — useState 3개로 관리 중

---

## 핵심 개념 1 — RESET 액션: 전체 초기화

현재 `DashboardContent.tsx`의 `FilterAction`에는 **전체 초기화 액션이 없다.**

```typescript
// ❌ 현재: 필터마다 개별 초기화만 가능
filterDispatch({ type: 'CLEAR_MONTH' });
filterDispatch({ type: 'CLEAR_RATING' });
filterDispatch({ type: 'SET_CATEGORY', category: null });
filterDispatch({ type: 'SET_SEARCH', query: '' });

// ✅ RESET 액션 추가 시: 한 번에 전체 초기화
filterDispatch({ type: 'RESET_ALL' });
```

`filterReducer`에 `RESET_ALL` 케이스 추가:

```typescript
// DashboardContent.tsx
type FilterAction =
  | { type: 'TOGGLE_MONTH'; month: number }
  | { type: 'CLEAR_MONTH' }
  | { type: 'TOGGLE_RATING'; rating: number }
  | { type: 'CLEAR_RATING' }
  | { type: 'SET_CATEGORY'; category: string | null }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'RESET_ALL' }; // 추가

const INITIAL_FILTER_STATE: FilterState = {
  selectedMonth: null,
  selectedCategory: null,
  selectedRating: null,
  searchQuery: '',
};

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    // ... 기존 케이스들
    case 'RESET_ALL':
      return INITIAL_FILTER_STATE; // 초기값을 상수로 분리 → 재사용 가능
    default:
      return state;
  }
};
```

> **핵심**: 초기값을 `INITIAL_FILTER_STATE` 상수로 분리해야 `useReducer(filterReducer, INITIAL_FILTER_STATE)`와 `RESET_ALL` 모두 같은 값을 참조한다.

---

## 핵심 개념 2 — useSearchParams와 reducer 연동

**왜 URL에 동기화하나?**
- 새로고침해도 필터 유지
- 뒤로가기로 이전 필터로 돌아갈 수 있음
- 링크 공유 시 같은 필터 상태 전달 가능

```
현재 DashboardContent: ?year=2025 → router.push()로 연도만 동기화
목표: ?year=2025&month=3&genre=소설 → 필터 전체 동기화
```

### 패턴: URL → reducer → URL (단방향 흐름)

```typescript
'use client';

import { useReducer, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. URL에서 초기값 읽기
const useFilterFromUrl = () => {
  const searchParams = useSearchParams();
  return {
    selectedMonth: searchParams.get('month')
      ? Number(searchParams.get('month'))
      : null,
    selectedCategory: searchParams.get('genre') ?? null,
    selectedRating: searchParams.get('rating')
      ? Number(searchParams.get('rating'))
      : null,
    searchQuery: searchParams.get('q') ?? '',
  };
};

// 2. 컴포넌트에서 사용
const [filterState, filterDispatch] = useReducer(
  filterReducer,
  useFilterFromUrl() // URL에서 초기값 → 새로고침해도 필터 유지
);

const router = useRouter();

// 3. 상태가 바뀔 때마다 URL 동기화
useEffect(() => {
  const params = new URLSearchParams();
  if (filterState.selectedMonth) params.set('month', String(filterState.selectedMonth));
  if (filterState.selectedCategory) params.set('genre', filterState.selectedCategory);
  if (filterState.selectedRating) params.set('rating', String(filterState.selectedRating));
  if (filterState.searchQuery) params.set('q', filterState.searchQuery);

  // replace: 히스토리 스택 쌓지 않음 (필터 변경 시마다 뒤로가기가 생기면 UX 불편)
  router.replace(`/dashboard?year=${selectedYear}&${params.toString()}`);
}, [filterState, selectedYear, router]);
```

### `push` vs `replace` 차이

| | `router.push` | `router.replace` |
|---|---|---|
| 히스토리 | 새 항목 추가 | 현재 항목 교체 |
| 뒤로가기 | 이전 필터로 이동 가능 | 이전 필터로 이동 불가 |
| 언제 쓰나 | 연도 변경처럼 "이전으로 돌아가고 싶은" 경우 | 필터처럼 세세하게 변하는 경우 |

현재 `DashboardContent`에서 연도는 `router.push` 사용 중 → **올바른 선택**

---

## page0127 실제 코드 사례

### DashboardContent.tsx — 현재 상태

```typescript
// line 189-194: useReducer로 4개 필터 통합 관리
const [filterState, filterDispatch] = useReducer(filterReducer, {
  selectedMonth: null,
  selectedCategory: null,
  selectedRating: null,
  searchQuery: '',
});
```

**현재 없는 것**: RESET_ALL 액션, URL 동기화

### PublicLibraryContent.tsx — 미구현 TODO

```typescript
// line 60-61: 아직 useState + 미사용 변수
const [_selectedMonth, _setSelectedMonth] = useState<number | null>(null);
const [_selectedRating, _setSelectedRating] = useState<number | null>(null);

// line 76-82: TODO 주석
const handleMonthClick = (_month: number) => {
  // TODO: 월별 필터링 구현
};
```

→ **여기에 useReducer + URL 동기화 도입이 어울리는 곳**

### PublicLibraryFilter.tsx — localStorage 패턴

```typescript
// line 31-42: lazy initialization으로 localStorage에서 복원
const [status, setStatus] = useState<FilterStatus>(
  () => (localStorage.getItem('public-library-status') as FilterStatus) || 'all'
);
```

`localStorage` vs `URL 파라미터` 차이:
- `localStorage`: 같은 브라우저에서만 유지, 링크 공유 불가
- URL 파라미터: 링크 공유 가능, 새 탭도 동일 상태

---

## 정리 표

| 상황 | 패턴 |
|---|---|
| 관련 없는 상태 1~2개 | `useState` |
| 연관된 상태 3개+ | `useReducer` |
| 전체 초기화 필요 | `useReducer` + `RESET_ALL` 액션 |
| URL에 상태 유지 | `useReducer` + `useSearchParams` 초기값 + `useEffect` 동기화 |
| 필터처럼 자주 바뀌는 URL | `router.replace` (히스토리 스택 방지) |

---

## 오늘 실험

### 실험 1 — RESET_ALL 액션 추가

`DashboardContent.tsx`의 `FilterAction`에 `RESET_ALL`을 추가하고,  
초기값을 `INITIAL_FILTER_STATE` 상수로 분리한 뒤 "필터 초기화" 버튼을 만들어본다.

```typescript
// 초기화 버튼 (JSX)
<button onClick={() => filterDispatch({ type: 'RESET_ALL' })}>
  필터 초기화
</button>
```

**확인**: 모든 필터 선택 후 버튼 클릭 시 한 번에 초기화 되는지 체크

### 실험 2 — URL 파라미터 읽기 연습

브라우저 주소창에 직접 `?month=3&genre=소설`을 입력했을 때,  
`useSearchParams()`로 값을 읽어 reducer 초기값에 넣어본다.

```typescript
const searchParams = useSearchParams();
const initialMonth = searchParams.get('month') ? Number(searchParams.get('month')) : null;
console.warn('URL에서 읽은 month:', initialMonth);
```

**확인**: 새로고침 후에도 필터 유지되는지 체크

---

## 다음 Day 예고

**Day 22 — useMemo**: 필터링된 책 목록을 매 렌더마다 재계산하지 않도록 최적화  
→ `DashboardBookList`에서 `books.filter()`가 렌더마다 실행되는 현재 코드 개선
