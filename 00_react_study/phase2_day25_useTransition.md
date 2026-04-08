# Day 25 — useTransition

## 오늘 읽을 코드

- [DashboardContent.tsx](../apps/page0127/src/widgets/dashboard/DashboardContent.tsx) — useTransition 적용된 월/평점 필터 핸들러
- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — 상태 탭 (전체/완독/읽는 중/읽고 싶은)

---

## 핵심 개념

### useTransition이란?

내가 **직접 호출하는 setState/dispatch**를 "급하지 않음"으로 표시하는 Hook.  
React가 더 급한 작업(input 타이핑 등)을 먼저 처리하고, transition을 나중에 처리한다.

```tsx
const [isPending, startTransition] = useTransition();

// startTransition 안에 넣으면 → 우선순위 낮아짐
startTransition(() => {
  dispatch({ type: 'TOGGLE_MONTH', month });
});

// isPending: transition이 처리되는 동안 true
// → 로딩 표시, 흐림 효과 등에 활용
```

### useDeferredValue와의 관계

| | useTransition | useDeferredValue |
|---|---|---|
| 목적 | 급하지 않은 렌더링을 뒤로 미룸 | 급하지 않은 렌더링을 뒤로 미룸 |
| 제어 지점 | setState 호출하는 쪽 | 값을 받아 쓰는 쪽 |
| 로딩 감지 | `isPending` (자동 제공) | `value !== deferredValue` (직접 비교) |

둘 다 목적은 같다. **제어 지점만 다르다.**

---

## page0127 실제 코드 사례

### 적용된 곳 — DashboardContent.tsx

차트 클릭(월/평점) → 책 목록 필터링은 급하지 않음 → `startTransition`으로 감쌈.

```tsx
const [isFilterPending, startFilterTransition] = useTransition();

// 월별 차트 클릭 → 목록 필터 업데이트
const handleMonthClick = (month: number) =>
  startFilterTransition(() => filterDispatch({ type: 'TOGGLE_MONTH', month }));

// 평점 차트 클릭 → 목록 필터 업데이트
const handleRatingClick = (rating: number) =>
  startFilterTransition(() => filterDispatch({ type: 'TOGGLE_RATING', rating }));

// isPending → 전환 중임을 제목에 표시
<CardTitle style={{ opacity: isFilterPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
  Recent Books
</CardTitle>
```

### 적용 안 된 곳 — DashboardBookList.tsx 상태 탭

현재 탭 클릭이 `onStatusChange` → 부모 dispatch로 이어진다.  
`handleStatusChange`는 DashboardBookList 안에서 직접 호출하므로 여기도 `useTransition` 적용 가능.

```tsx
// 현재
const handleStatusChange = (status: BookStatus | 'all') => {
  setCurrentPage(1);
  onStatusChange(status);
};

// useTransition 적용 시
const [isTabPending, startTabTransition] = useTransition();

const handleStatusChange = (status: BookStatus | 'all') => {
  setCurrentPage(1);
  startTabTransition(() => onStatusChange(status));
};

// 탭 버튼에 pending 표시
<button
  onClick={() => handleStatusChange('completed')}
  disabled={isTabPending}
  style={{ opacity: isTabPending ? 0.6 : 1 }}
>
  완독
</button>
```

---

## 정리 규칙 1줄

> **useTransition = 내가 직접 호출하는 dispatch/setState에 "이건 급하지 않아"를 붙이는 것. isPending으로 전환 중 상태를 UI에 표현할 수 있다.**

---

## 언제 체감하나?

Day 24와 동일하다. 데이터가 적을 때는 차이가 없다.

```
탭 클릭 → 책 수백 권 필터링 → 화면 버벅임
         ↓ useTransition 적용
탭 클릭 즉시 반응 + 목록은 자연스럽게 업데이트
```

사고 흐름:
```
"버튼/탭 클릭 후 화면이 버벅인다"
         ↓
"클릭 반응은 즉시, 결과 렌더링은 늦어도 된다"
         ↓
"내가 setState/dispatch를 직접 호출하는가?" → YES
         ↓
startTransition(() => dispatch(...))
```

---

## 오늘 실험

### 실험 1 — DashboardBookList 상태 탭에 적용

위의 코드를 실제로 `DashboardBookList.tsx`에 추가해본다.  
탭 클릭 시 `isTabPending`이 잠깐 `true`가 되는지 확인.  
(책이 적어서 순식간에 끝나므로 눈에 안 보일 수 있음 → 실험 2 참고)

### 실험 2 — 인위적으로 느리게 만들어 차이 확인

```tsx
// DashboardBookList useMemo 안에 임시 추가
const start = performance.now();
while (performance.now() - start < 500) {} // 지우는 거 잊지 말 것
```

추가 후:
- `useTransition` 없음 → 탭 클릭 후 500ms 동안 UI 전체 멈춤
- `useTransition` 있음 → 탭은 즉시 반응, 목록만 500ms 후 바뀜

---

## 다음 Day 예고

**Day 26 — useId**  
고유 id가 필요한 접근성(a11y) 상황에서 SSR-safe하게 id를 생성하는 Hook.  
필터 체크박스의 `label[for]` 연결에 적용.
