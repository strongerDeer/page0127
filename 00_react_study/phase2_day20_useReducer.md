# Day 20 — useReducer: 교체 기준

> "setState가 여러 개 흩어져 있는데 항상 같이 바뀐다면, 그건 useReducer가 필요하다는 신호다."

## 오늘 읽을 코드

- [widgets/dashboard/DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — 필터 상태 4개가 분산된 현재 구조
- [features/stats/ui/DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — 필터를 props로 받는 자식

---

## useState vs useReducer: 교체 기준

```
useState를 쓸 때                useReducer로 바꿀 때
────────────────────            ──────────────────────────────
상태 1개, 독립적으로 변함        상태 여러 개가 항상 함께 변함
변경 로직이 단순                 변경 로직이 복잡하거나 조건이 많음
                                "액션 이름"으로 의도가 명확해야 할 때
```

### 현재 DashboardContent 문제

```tsx
// 필터 state 4개가 분산되어 있음
const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedRating, setSelectedRating] = useState<number | null>(null);
const [searchQuery, setSearchQuery] = useState('');

// 월 클릭 → selectedMonth만 바뀜. 근데 실제론 페이지도 초기화해야 함
const handleMonthClick = (month: number) => {
  setSelectedMonth((prev) => (prev === month ? null : month));
  // 페이지 초기화를 잊으면 버그 — 연관된 상태를 수동으로 챙겨야 함
};

// RESET: 필터 초기화할 때 4번 호출해야 함
setSelectedMonth(null);
setSelectedCategory(null);
setSelectedRating(null);
setSearchQuery('');
```

---

## useReducer 구조

```tsx
// ① 액션 타입 정의 — "어떤 명령이 가능한가"가 한눈에 보임
type FilterAction =
  | { type: 'SET_MONTH'; month: number | null }
  | { type: 'SET_CATEGORY'; category: string | null }
  | { type: 'SET_RATING'; rating: number | null }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'RESET' };

// ② 초기 상태
const initialFilter = {
  selectedMonth: null as number | null,
  selectedCategory: null as string | null,
  selectedRating: null as number | null,
  searchQuery: '',
};

// ③ reducer — 액션에 따라 상태를 어떻게 바꿀지 한 곳에 정의
function filterReducer(state: typeof initialFilter, action: FilterAction) {
  switch (action.type) {
    case 'SET_MONTH':
      // 같은 월 클릭 시 토글 — 이 로직이 reducer 안에 캡슐화됨
      return {
        ...state,
        selectedMonth: state.selectedMonth === action.month ? null : action.month,
      };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.category };
    case 'SET_RATING':
      return {
        ...state,
        selectedRating: state.selectedRating === action.rating ? null : action.rating,
      };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'RESET':
      return initialFilter; // 한 줄로 전체 초기화
    default:
      return state;
  }
}

// ④ 컴포넌트에서 사용
const [filter, dispatch] = useReducer(filterReducer, initialFilter);

// 호출부가 명확해짐
dispatch({ type: 'SET_MONTH', month: 3 });
dispatch({ type: 'RESET' });
```

---

## page0127 실제 코드: 리팩토링 전/후 비교

### Before — 분산된 setState

```tsx
// DashboardContent.tsx 현재 구조
const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedRating, setSelectedRating] = useState<number | null>(null);
const [searchQuery, setSearchQuery] = useState('');

// 핸들러마다 따로 호출
const handleMonthClick = (month: number) => {
  setSelectedMonth((prev) => (prev === month ? null : month));
};
const handleRemoveMonthFilter = () => setSelectedMonth(null);
const handleRatingClick = (rating: number) => {
  setSelectedRating((prev) => (prev === rating ? null : rating));
};
const handleRemoveRatingFilter = () => setSelectedRating(null);

// DashboardBookList에 4개 props 따로 전달
<DashboardBookList
  selectedMonth={selectedMonth}
  selectedCategory={selectedCategory}
  selectedRating={selectedRating}
  searchQuery={searchQuery}
  onCategoryChange={setSelectedCategory}
  onRemoveMonthFilter={handleRemoveMonthFilter}
  onRemoveRatingFilter={handleRemoveRatingFilter}
  onSearchChange={setSearchQuery}
/>
```

### After — useReducer로 통합

```tsx
const [filter, dispatch] = useReducer(filterReducer, initialFilter);

// 핸들러가 dispatch 호출로 통일됨
// 토글 로직이 reducer 안에 있어서 핸들러가 단순해짐

<DashboardBookList
  filter={filter}              // 상태 객체 하나로 통합
  onDispatch={dispatch}        // dispatch 하나만 넘김
/>
```

---

## 언제 useState, 언제 useReducer?

```
useState                          useReducer
──────────────────                ──────────────────────────────
독립적인 단일 상태                 여러 상태가 함께 변함
boolean 토글                      복잡한 상태 전환 (토글 + 초기화 등)
단순 값 업데이트                   다음 상태가 이전 상태에 의존
                                  "RESET" 같은 전체 초기화 필요
                                  상태 변경 로직을 테스트하고 싶을 때
```

**규칙:** 관련된 setState가 3개 이상 항상 같이 바뀐다면 useReducer를 고려한다.

---

## 정리

| | useState | useReducer |
|--|---------|------------|
| 상태 개수 | 1~2개 | 여러 개가 연관됨 |
| 변경 로직 | 컴포넌트 안에 분산 | reducer 함수에 집중 |
| 초기화 | 각각 호출 | `RESET` 액션 하나 |
| 의도 표현 | `setX(value)` | `dispatch({ type: 'SET_X' })` |
| 테스트 | 컴포넌트와 결합 | reducer만 따로 단위 테스트 가능 |

---

## 오늘 실험

1. **filterReducer 분리**: `DashboardContent`의 필터 state 4개를 `useReducer`로 교체해보기
2. **RESET 액션**: 필터 초기화 버튼 추가 → `dispatch({ type: 'RESET' })` 한 줄로 동작 확인

---

## 다음 Day 예고

**Day 21 — useCallback: 함수 재생성 비용**
- `DashboardContent`의 핸들러들이 자식에게 내려갈 때 어떤 문제가 생기는지
- `useCallback`이 필요한 시점과 남용하면 안 되는 이유
