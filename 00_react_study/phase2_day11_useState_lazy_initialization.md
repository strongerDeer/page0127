# Day 11 — useState: Lazy Initialization

> useState에 초기값을 넘기는 방법이 두 가지 있다. 이 차이를 모르면 불필요한 연산이 매 렌더링마다 실행된다.

---

## 오늘 읽을 코드

- [DashboardBookList.tsx:83](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L83) — statusFilter 초기값

---

## 핵심 개념

### useState의 초기값은 딱 한 번만 쓰인다

```tsx
const [count, setCount] = useState(0);
```

`0`은 컴포넌트가 **처음 마운트될 때만** 사용된다. 이후 리렌더링에서는 무시된다.

그런데 초기값 자리에 **함수 호출**을 넣으면?

```tsx
const [value, setValue] = useState(expensiveFunction()); // ← 함수 호출
```

`expensiveFunction()`은 리렌더링마다 실행된다. 결과는 버려지지만, **실행 자체는 매번 일어난다**.

---

## 문제: 리렌더링마다 실행되는 초기값 계산

```tsx
// ❌ localStorage.getItem()이 리렌더링마다 호출된다
const [statusFilter, setStatusFilter] = useState(
  localStorage.getItem('statusFilter') || 'all'
);
```

컴포넌트가 리렌더링될 때마다 (필터 바꿀 때, 페이지 이동할 때 등) `localStorage.getItem()`이 실행된다. 결과는 버려지는데 I/O가 계속 발생한다.

---

## 해결: Lazy Initialization — 함수를 넘긴다

```tsx
// ✅ 초기화 함수를 넘긴다 (호출 결과 X, 함수 자체 O)
const [statusFilter, setStatusFilter] = useState(
  () => localStorage.getItem('statusFilter') || 'all'
);
```

`() =>` 를 앞에 붙이는 것이 전부다. React가 첫 마운트 때만 이 함수를 호출한다. 이후 리렌더링에서는 실행하지 않는다.

---

## 핵심 차이

```tsx
// 값을 넘김 — 매 렌더링마다 평가된다
useState(getValue())

// 함수를 넘김 — 첫 렌더링에만 호출된다
useState(() => getValue())
```

| | 실행 시점 | 성능 |
|--|-----------|------|
| `useState(fn())` | 매 렌더링 | 낭비 |
| `useState(() => fn())` | 최초 1회 | 효율적 |

---

## page0127에 적용해보기

현재 코드:

```tsx
// apps/page0127/src/features/stats/ui/DashboardBookList.tsx:83
const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
```

새로고침하면 항상 '전체' 탭으로 돌아간다.

**lazy initialization으로 마지막 탭 복원**:

```tsx
// 첫 마운트 때만 localStorage 읽음
const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>(
  () => (localStorage.getItem('dashboard-status-filter') as BookStatus | 'all') || 'all'
);

// 탭 변경 시 localStorage에 저장
const handleStatusChange = (status: BookStatus | 'all') => {
  setCurrentPage(1);
  setStatusFilter(status);
  localStorage.setItem('dashboard-status-filter', status); // 추가
};
```

이제 새로고침해도 마지막에 선택했던 탭이 유지된다.

---

## 언제 필요한가?

Lazy initialization이 실질적으로 필요한 경우:

| 상황 | 이유 |
|------|------|
| `localStorage.getItem()` | 동기 I/O, 매번 읽으면 낭비 |
| `JSON.parse(복잡한 문자열)` | 파싱 비용이 있음 |
| 배열/객체 생성 로직 | `new Map()`, 정렬, 필터 등 |
| 외부 데이터 읽기 | 쿠키, sessionStorage 등 |

반대로 lazy initialization이 **필요 없는** 경우:

```tsx
useState(0)          // 숫자 리터럴 — 비용 없음
useState('')         // 문자열 리터럴 — 비용 없음
useState(false)      // 불리언 — 비용 없음
useState(null)       // null — 비용 없음
```

리터럴 값은 어차피 평가 비용이 0에 가까우니 `() =>` 붙일 필요가 없다.

---

## 오늘 실험

1. [DashboardBookList.tsx:83](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L83) 열기
2. `statusFilter`에 lazy init + localStorage 저장 코드 적용해보기
3. '완독' 탭 선택 → 새로고침 → 탭이 유지되는지 확인
4. 브라우저 개발자도구 Application → Local Storage에서 값 확인

---

## 다음 Day 12

`useState` 세 번째 패턴 — **불변성** (배열/객체 상태 업데이트 시 `push` vs `spread`)
