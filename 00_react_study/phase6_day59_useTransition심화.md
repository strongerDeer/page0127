# Day 59 — useTransition 심화 (대량 렌더링을 부드럽게)

> Day 58 예고대로 [DashboardBookList.tsx:130](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L130)의
> `startTabTransition`을 깊게 판다. 핵심: **"급한 업데이트"와 "안 급한 업데이트"를 나눠
> 무거운 재렌더가 입력 반응성을 막지 않게 한다.**

---

## 1. 오늘 읽을 코드

- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — `useTransition` + `useDeferredValue` 둘 다 사용
- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — 차트 클릭 필터에 `startFilterTransition`

---

## 2. 핵심 개념

### 2-0. 먼저, Transition이 뭐고 이름이 왜 헷갈리나

**Transition = "전환/넘어감".** (`trans` 가로질러 + `it` 가다 → 한 상태에서 다른 상태로 건너감)
영화의 장면 전환처럼 **뚝 끊기지 않고 부드럽게 넘어가게** 하는 게 목적. React에선
"이 상태 전환은 급하지 않으니 우선순위를 낮춰 부드럽게 처리해줘"라는 표시다.

이름이 비슷해서 헷갈리는데, 셋의 정체가 다르다:

| 이름 | 정체 |
| --- | --- |
| `useTransition` | **훅** (React 제공) |
| `startTransition` | `useTransition`이 **돌려주는 함수** |
| `startTabTransition` | 그냥 **개발자가 지은 변수 이름** (= `startTransition`) |

```tsx
// useTransition() 호출 → [isPending, 함수] 반환
const [isTabPending, startTabTransition] = useTransition();
//                    ^^^^^^^^^^^^^^^^ React API가 아니라, 받은 함수에 붙인 이름일 뿐
```

→ page0127의 `startTabTransition`은 `startTransition`을 "탭 전환용"이라 이름 붙인 것뿐.
React가 주는 건 `useTransition`(훅) 하나고, 거기서 나온 함수는 아무 이름으로나 받을 수 있다.

### 2-1. urgent vs transition — React가 업데이트에 우선순위를 매긴다

```tsx
const [isPending, startTransition] = useTransition();

// 급함(urgent): 사용자에게 즉시 반응해야 함 (입력, 클릭 하이라이트)
setCurrentPage(1);

// 안 급함(transition): 결과가 한 박자 늦어도 됨 (무거운 목록 재계산)
startTransition(() => {
  onStatusChange(status); // 이 안의 setState는 "낮은 우선순위"로 표시
});
```

- `startTransition(fn)`: fn 안의 state 업데이트를 **non-urgent**로 표시 → React가 우선순위를 낮춰 처리하고, 그 사이 들어온 **급한 업데이트(입력 등)를 막지 않는다.**
- `isPending`: 전환이 진행 중인지 → 로딩/흐림 표시에 사용.
- **interruptible**: transition 렌더링은 도중에 더 급한 업데이트가 오면 **중단·폐기**되고 최신 것부터 다시 그린다. (그래서 끊김이 안 생김)

> 💡 **"setState를 감싼다"** = `startTransition(() => { ... })`의 `{ }` 안에 setState 호출을 넣는다는 뜻.
> 내가 그 setState를 호출하는 코드를 쓸 수 있을 때(보통 **내 컴포넌트가 `useState`/`useReducer`로 가진 상태**일 때) 감쌀 수 있다.

### 2-2. `startTransition` vs `useDeferredValue` — 같은 목적, 쓰는 위치가 다름

| | 언제 쓰나 |
| --- | --- |
| `startTransition` | **내가 setState를 호출하는 쪽**을 감쌀 수 있을 때 (이벤트 핸들러 안) |
| `useDeferredValue` | 값을 **props로 받아** 직접 setState를 못 감쌀 때 (그 값의 "지연 버전"을 만듦) |

> 둘 다 "이 업데이트는 급하지 않다"를 React에 알리는 것. **출발점이 setState면 transition, 출발점이 받은 값이면 deferred.**

⚠️ 주의: `startTransition` 콜백 안에는 **동기 setState**를 둔다. `await` 뒤의 setState는 transition으로 인식 안 될 수 있다 (비동기는 별도 처리 필요).

---

## 3. page0127 실제 사례

### 사례 A — 탭/정렬 변경: 버튼 반응은 즉시, 목록 재계산은 transition

[DashboardBookList.tsx:256-264](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L256-L264):

```tsx
const [isTabPending, startTabTransition] = useTransition(); // line 130

const handleStatusChange = (status: BookStatus | 'all') => {
  setCurrentPage(1);                                  // 급함: 페이지 즉시 1로
  startTabTransition(() => onStatusChange(status));   // 안 급함: 무거운 filteredBooks 재계산
};

const handleSortChange = (option: string) => {
  setCurrentPage(1);
  startTabTransition(() => setSortOption(option));
};
```

`filteredBooks`는 [useMemo로 filter+sort](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L157)하는데, 책이 많으면 무겁다. 탭을 누른 순간 이 재계산이 동기로 돌면 버튼이 굳는다. → **재계산을 transition으로 미뤄** 클릭 반응은 즉각 유지.

그리고 그 "처리 중"을 [StatusTabFilter에 `isPending`으로 전달](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L287)해서 탭 전체를 흐리게:

```tsx
<StatusTabFilter value={statusFilter} onChange={...} isPending={isTabPending}>
```

### 사례 B — 차트 클릭 필터도 transition

[DashboardContent.tsx:247-250](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L247-L250):

```tsx
const [isFilterPending, startFilterTransition] = useTransition(); // line 230

const handleMonthClick = (month: number) =>
  startFilterTransition(() => filterDispatch({ type: 'TOGGLE_MONTH', month }));
```

차트의 특정 월/평점을 클릭 → 책 목록 필터링은 급하지 않다. `isFilterPending`으로 [목록 제목을 흐리게](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx#L472-L477) 처리.

### 사례 C — 검색어는 props라 `useDeferredValue`

[DashboardBookList.tsx:124-126](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L124-L126):

```tsx
// searchQuery는 부모 props → 여기서 setState 못 함 → startTransition 불가
const deferredSearchQuery = useDeferredValue(searchQuery);
const isSearchStale = searchQuery !== deferredSearchQuery; // 아직 안 따라잡음
```

input 표시값은 `searchQuery`(즉시), 목록 필터링은 `deferredSearchQuery`(한 박자 늦게) → **타이핑이 목록 재계산에 막히지 않는다.** `isSearchStale`로 [목록을 흐리게](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L391-L395).

→ **사례 A·B는 `startTransition`, 사례 C는 `useDeferredValue`.** 같은 파일에 둘의 쓰임 차이가 그대로 들어있다.

---

## 4. 정리

| 구분 | urgent (급함) | transition (안 급함) |
| --- | --- | --- |
| 예 | 입력, 페이지 번호 즉시 반영 | 무거운 목록 필터·정렬 재계산 |
| page0127 | `setCurrentPage(1)` | `startTabTransition(() => onStatusChange(...))` |
| 표시 | — | `isPending`으로 흐리게 |

> 규칙 한 줄: **"setState를 감쌀 수 있으면 `startTransition`, props로 받은 값이면 `useDeferredValue`."**

### 결정 트리 — 둘 중 뭘 쓸까

```text
이 업데이트, 급한가?
├─ 급함 → 그냥 setState 호출                  (예: setCurrentPage(1))
└─ 안 급함
     ├─ 내가 setState를 호출하는 코드를 쓰는가?  (= 내 컴포넌트가 가진 상태)
     │     → startTransition(() => setState(...))   로 감싼다
     └─ props로 값을 받기만 하는가?             (= 내가 못 바꿈)
           → useDeferredValue(받은값)              로 지연 복사본을 만든다
```

> `defer` = "미루다/지연". `useDeferredValue(값)` = "이 값의 **지연된 복사본**을 줘"
> (급한 업데이트가 끝난 뒤에야 따라잡는 값).

---

## 5. 오늘 실험 (2가지)

1. **transition 제거 체감**
   [DashboardBookList.tsx:256-259](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L256-L259)에서
   `startTabTransition(() => onStatusChange(status))`를 그냥 `onStatusChange(status)`로 바꿔본다.
   책이 많을 때 탭 클릭 → 버튼이 굳는 느낌 + `isTabPending` 흐림이 사라지는지 비교.

2. **deferred 제거 체감**
   [DashboardBookList.tsx:124](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L124)의
   `deferredSearchQuery`를 `searchQuery`로 직접 바꿔 필터링에 사용 → 검색어 타이핑이
   목록 재계산에 막혀 input이 끊기는지 확인. (React DevTools Profiler로 렌더 시간도 비교)

---

## 6. page0127 전수 검사 결과 — 추가 적용처 없음 ✅

> 요청으로 page0127 전체를 전수 조사(서브에이전트). **새로 적용할 곳 없음 — 이미 최적 지점에 적용 완료.**

**왜 없나:** 무거운 동기 재계산이 입력을 막을 수 있는 유일한 지점 = 개인 책 목록(`books`, 수십 권)의
복합 filter+sort+map+검색. 이건 이미 [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx)
(`useTransition` + `useDeferredValue`)와 [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx)
(차트 클릭 필터의 `useTransition`)에 적용돼 있다.

**직접 검증:** 공개 서재 [PublicLibraryContent.tsx:210](../apps/page0127/src/widgets/public-library/PublicLibraryContent.tsx#L210)는
`DashboardBookList`를 **재사용**한다 → 필터/검색의 무거운 부분이 그 안에서 처리되므로
**자동으로 transition·deferred 혜택**을 받는다. (정적 분석이 놓칠 뻔한 부분을 직접 확인 → 누락 아님)

**나머지가 불필요한 이유 (3가지로 수렴):**

| 패턴 | 예 | 왜 불필요 |
| --- | --- | --- |
| 데이터가 작음 (수~수십 개) | 완독 권수, 카테고리, 캘린더, 랭킹·드롭다운(5개) | 동기 재계산이 입력을 막을 만큼 무겁지 않음 |
| 이미 디바운스 처리 | `BookSearchInput` (300/400ms) | 입력 응답성 이미 확보 |
| 클라 동기 재계산이 없음 | 무한스크롤·React Query·서버 페이지네이션(`books/all`) | transition이 감쌀 setState가 없음 |

> 💡 교훈: **transition/deferred는 "무거운 동기 계산이 입력을 막을 때"만 의미가 있다.**
> 데이터가 작으면 과한 최적화. (Day 58 `<Activity>`와 같은 결론 — 이 코드베이스는 이미 잘 짜여 있다.)

---

## 7. 다음 Day 예고

**Day 60 — useTransition + Suspense**: 전환 중 Suspense fallback을 어떻게 조합하는지.
탭 전환 시 빈 화면(fallback) 대신 **이전 내용을 유지**하는 UX를 다룬다.
오늘의 `isPending` 흐림 처리가 Suspense와 만나면 어떻게 달라지는지 비교한다.
