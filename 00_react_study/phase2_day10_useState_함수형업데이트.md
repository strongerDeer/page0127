# Day 10 — useState: 함수형 업데이트

> Phase 2 첫 날. useState를 그냥 쓰고 있었다면, 오늘 제대로 이해하고 가자.

---

## 오늘 읽을 코드

- [DashboardBookList.tsx](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx) — 페이지네이션 버튼
- [LikeButton.tsx](../apps/page0127/src/features/like/ui/LikeButton.tsx) — 좋아요 카운트

---

## 핵심 개념

### setState에는 두 가지 사용법이 있다

```tsx
// 1. 직접 업데이트 — 새 값을 그냥 넘긴다
setState(newValue);

// 2. 함수형 업데이트 — 이전 값을 받아서 새 값을 계산한다
setState((prev) => newValue);
```

언제 어떤 걸 써야 할까?

---

## 직접 업데이트로 충분한 경우

새 값이 **이전 state와 무관할 때**.

```tsx
// 필터를 '완독'으로 바꾼다 — 이전 값이 뭐든 상관없다
setStatusFilter("completed");

// 탭을 1번으로 이동 — 이전 페이지가 몇이든 상관없다
setCurrentPage(1);
```

page0127에서 필터 변경 시 첫 페이지로 돌아가는 코드:

```tsx
// apps/page0127/src/features/stats/ui/DashboardBookList.tsx
const handleStatusChange = (status: BookStatus | "all") => {
  setCurrentPage(1); // 직접 업데이트 — "무조건 1페이지"
  setStatusFilter(status);
};
```

---

## 함수형 업데이트가 필요한 경우

새 값이 **이전 state를 기반으로 계산될 때**.

### 예시 1 — 페이지네이션 이전/다음 버튼

```tsx
// apps/page0127/src/features/stats/ui/DashboardBookList.tsx (L357, L382)

// 이전 버튼: 현재 페이지에서 1 빼기 (단, 최소 1)
onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}

// 다음 버튼: 현재 페이지에서 1 더하기 (단, 최대 totalPages)
onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
```

`prev`는 React가 보장하는 **가장 최신 state 값**이다.

---

### 예시 2 — 좋아요 카운트 (낙관적 업데이트)

```tsx
// apps/page0127/src/features/like/ui/LikeButton.tsx (L48)

// 좋아요 추가/취소에 따라 카운트 +1 or -1
setCount((prev) => (currentlyLiked ? prev - 1 : prev + 1));
```

에러가 나면 반대로 롤백:

```tsx
// apps/page0127/src/features/like/ui/LikeButton.tsx (L59)

// 에러 시 원상복구: 반대 방향으로 되돌린다
setCount((prev) => (currentlyLiked ? prev + 1 : prev - 1));
```

여기서 `prev`를 쓰는 이유: `onMutate`와 `onError`가 연속으로 실행될 수 있어서, 가장 최신 카운트 값을 기준으로 계산해야 한다.

---

## 왜 함수형 업데이트가 안전한가?

### 클로저란?

함수는 **자신이 만들어진 시점의 변수를 기억**한다. 이걸 클로저라고 한다.

```tsx
const [count, setCount] = useState(0); // count = 0

// handleClick은 count = 0일 때 만들어진 함수다
const handleClick = () => {
  console.log(count); // 이 count는 "만들어진 시점의 count" = 0
};
```

React가 리렌더링되면 `count`는 새 값이 되지만, **이미 만들어진 `handleClick` 함수 안의 `count`는 여전히 0을 가리킨다.** 이게 "클로저에 갇힌 값"이다.

---

### Stale State 문제 — 클로저 때문에 생기는 버그

```tsx
const [count, setCount] = useState(0); // count = 0 으로 시작

const handleClick = () => {
  // 이 함수가 만들어진 시점의 count = 0
  setCount(count + 1); // 0 + 1 = 1 로 요청
  setCount(count + 1); // 0 + 1 = 1 로 요청 (count가 여전히 0!)
  // 두 번 호출했지만 결과는 1
};
```

```
버튼 클릭 → handleClick 실행
  setCount(0 + 1) → "1로 바꿔줘"
  setCount(0 + 1) → "1로 바꿔줘" (똑같은 값)
  React가 두 요청을 batching → state = 1
```

기대: 2 / 실제: 1 → **버그**

---

### 함수형 업데이트는 이 문제를 피한다

```tsx
const handleClick = () => {
  setCount((prev) => prev + 1); // "현재 state가 뭐든, 거기서 +1 해줘"
  setCount((prev) => prev + 1); // "또 +1 해줘"
  // 결과: 2
};
```

```
버튼 클릭 → handleClick 실행
  setCount(prev => prev + 1) → "현재 값(0)에서 +1" → 1
  setCount(prev => prev + 1) → "현재 값(1)에서 +1" → 2
  React가 순서대로 실행 → state = 2
```

`prev`는 클로저에 갇힌 값이 아니라, **React가 실행 시점에 직접 꺼내서 전달하는 최신 값**이다.

---

### 실무에서 자주 만나는 두 가지 상황

**① 연속 setState 호출** (위 예시)

**② 비동기 콜백 안** — page0127 LikeButton이 바로 이 경우

```tsx
// apps/page0127/src/features/like/ui/LikeButton.tsx

onMutate: async (currentlyLiked) => {
  setIsLiked(!currentlyLiked);
  setCount((prev) => (currentlyLiked ? prev - 1 : prev + 1)); // ← 함수형
},
onError: (_error, currentlyLiked) => {
  setIsLiked(currentlyLiked);
  setCount((prev) => (currentlyLiked ? prev + 1 : prev - 1)); // ← 함수형
},
```

`onMutate`와 `onError`는 비동기로 실행된다. 이 시점에 클로저 안의 `count`는 오래된 값일 수 있다. `prev =>`를 쓰면 React가 실행 시점의 최신 값을 전달하니까 안전하다.

---

**React는 연속된 `setState`를 batching(묶음 처리)한다.** 직접 업데이트는 클로저에 갇힌 값을 쓰지만, 함수형 업데이트는 React가 현재 state를 전달해준다.

---

## 토글 패턴

토글은 이전 값을 반전시키는 거니까 함수형 업데이트가 더 안전하다.

```tsx
// ❌ 이전 값에 의존하면서 직접 업데이트 (stale state 위험)
setIsOpen(!isOpen);

// ✅ 함수형 업데이트
setIsOpen((prev) => !prev);
```

단, 이벤트 핸들러가 동기적으로 한 번만 호출되는 단순한 경우엔 `!isOpen`도 실무에서 흔히 쓴다. (page0127 코드베이스에도 섞여 있다.) 기억할 것: **연속 호출이나 비동기 상황이면 무조건 함수형으로**.

---

## 정리

| 상황                   | 패턴                         | 예시                               |
| ---------------------- | ---------------------------- | ---------------------------------- |
| 새 값이 이전 값과 무관 | `setState(newValue)`         | `setStatusFilter('completed')`     |
| 이전 값 기반으로 계산  | `setState(prev => ...)`      | `setCurrentPage(prev => prev + 1)` |
| 토글 (단순)            | 둘 다 가능                   | `setIsOpen(prev => !prev)` 권장    |
| 비동기 콜백 안         | `setState(prev => ...)` 필수 | `onMutate`, `onError` 안에서       |

---

## 오늘 실험

1. [DashboardBookList.tsx:357](../apps/page0127/src/features/stats/ui/DashboardBookList.tsx#L357) 열기
2. `(prev) => Math.max(1, prev - 1)` 를 `currentPage - 1`로 바꿔보기
3. 실제로 빠르게 연속 클릭했을 때 차이가 생기는지 확인
4. 원래대로 돌려놓기

---

## 다음 Day 11

`useState` 두 번째 패턴 — **lazy initialization** (마지막 탭 상태를 localStorage에서 복원하기)
