# Day 15 — useEffect: 의존성 배열

> 의존성 배열을 올바르게 작성하는 법과, 잘못 작성하면 어떤 버그가 생기는지 page0127 실제 코드로 확인한다.

---

## 오늘 읽을 코드

- [useNotificationRealtime.ts](../apps/page0127/src/entities/notification/lib/hooks/useNotificationRealtime.ts) — `[userId, queryClient]`
- [FollowStats.tsx](../apps/page0127/src/features/follow/ui/FollowStats.tsx) — `[queryClient]`
- [BookSearchInput.tsx](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx) — `[inputValue, onSearchChange]`

---

## 의존성 배열이란

useEffect가 **언제 다시 실행할지 결정하는 목록**이다.

```tsx
useEffect(() => {
  // effect 코드
}, [여기 있는 값이 바뀔 때마다 실행]);
```

React는 이전 렌더링과 현재 렌더링의 의존성 값을 `Object.is()`로 비교한다.
값이 바뀌면 → effect 재실행, 같으면 → 건너뜀.

---

## 의존성 배열 — 3가지 형태

```tsx
// 1. 배열 없음 → 매 렌더링마다 실행 (실무에서 거의 안 씀)
useEffect(() => {
  document.title = '매번 바뀜';
});

// 2. 빈 배열 → 마운트(첫 렌더) 1회만 실행
useEffect(() => {
  console.log('처음 한 번만');
}, []);

// 3. 값 지정 → 해당 값이 바뀔 때마다 실행
useEffect(() => {
  localStorage.setItem('filter', statusFilter);
}, [statusFilter]);
```

---

## exhaustive-deps — ESLint가 자동으로 감지한다

`react-hooks/exhaustive-deps` 규칙은 **effect 안에서 사용한 값이 의존성 배열에 없으면 경고**를 낸다.

```tsx
// ❌ ESLint 경고: userId가 빠져 있음
useEffect(() => {
  fetchData(userId); // userId를 쓰는데
}, []);             // 배열에 없음 → stale closure 버그

// ✅ 올바름
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

**우리 프로젝트 결과**: `npx eslint src` 실행 시 `exhaustive-deps` 경고 0건.
이미 모든 의존성 배열이 올바르게 작성되어 있다.

---

## page0127 실제 코드 3가지 사례

### 1. useNotificationRealtime — `[userId, queryClient]`

[useNotificationRealtime.ts:29-68](../apps/page0127/src/entities/notification/lib/hooks/useNotificationRealtime.ts#L29)

```tsx
export function useNotificationRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`) // userId 사용
      ...

    return () => {
      supabase.removeChannel(channel); // 클린업
    };
  }, [userId, queryClient]); // ← userId와 queryClient 모두 포함
}
```

**왜 `userId`가 의존성에 있는가?**

```
userId가 바뀌면 (로그인 유저가 달라지면)
→ 이전 구독 클린업 → 새 userId로 새로 구독
```

userId를 배열에서 빼면? → 처음 로그인한 사람의 채널만 구독하고
다른 사람으로 전환해도 갱신되지 않는 버그 발생.

**왜 `queryClient`가 의존성에 있는가?**

`queryClient`는 effect 안에서 사용한 값이라 포함해야 한다.
실제로 `useQueryClient()`가 반환하는 인스턴스는 앱 생명주기 동안 변하지 않으므로
이 의존성이 effect를 재실행시키지는 않는다. 규칙을 지키면서도 성능에 무해하다.

---

### 2. FollowStats — `[queryClient]`

[FollowStats.tsx:39-46](../apps/page0127/src/features/follow/ui/FollowStats.tsx#L39)

```tsx
useEffect(() => {
  const unsubscribe = followBroadcast.onFollowEvent(() => {
    queryClient.invalidateQueries({ queryKey: ['follow'] }); // queryClient 사용
  });

  return unsubscribe;
}, [queryClient]); // ← queryClient만 의존성
```

`followBroadcast`는 모듈 레벨 싱글톤 (컴포넌트 밖에서 선언된 상수)이라
렌더링과 관계없이 항상 같은 값 → 의존성 불필요.

---

### 3. BookSearchInput — `[inputValue, onSearchChange]`

[BookSearchInput.tsx:37-44](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L37)

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    onSearchChange(inputValue); // 둘 다 사용
  }, 300);

  return () => clearTimeout(timer);
}, [inputValue, onSearchChange]); // ← 둘 다 포함
```

`onSearchChange`가 의존성에 있는 이유:
- effect 안에서 사용한 함수도 포함해야 한다
- 부모 컴포넌트가 새 함수를 내려보낼 때 effect가 최신 함수를 참조해야 하기 때문

**주의**: 부모에서 `onSearchChange`를 `useCallback` 없이 인라인으로 선언하면
렌더링마다 새 함수가 만들어져 effect가 매번 재실행될 수 있다.
→ Day 22에서 `useCallback`으로 해결한다.

---

## 함수를 의존성 배열에 넣으면 생기는 문제 — useCallback 기준

Day 15에서 미리 다루는 이유: 오늘 실제 버그를 고쳤기 때문.

### 문제 상황 — 무한루프

```tsx
// ❌ useBookCRUD 훅 내부 (수정 전)
const getBookById = async (id: string) => { ... };
//    ↑ useCallback 없음 → 렌더마다 새 함수 객체 생성
```

```tsx
// ❌ edit/page.tsx (수정 전)
useEffect(() => {
  getBookById(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps ← 경고를 덮어버림
}, [id]); // getBookById를 슬쩍 빼놓음
```

ESLint가 `getBookById`를 배열에 넣으라고 경고했는데, 넣으면 무한루프가 나니까 주석으로 무시했다.
근본 원인은 `getBookById`가 렌더마다 새 참조를 만들기 때문이다.

```
렌더 → getBookById 새 참조 생성
→ useEffect 재실행 (deps 바뀜)
→ setIsLoading(true) → 리렌더
→ getBookById 또 새 참조
→ 무한반복
```

---

### 해결 — useCallback으로 참조 고정

```tsx
// ✅ useBookCRUD 훅 내부 (수정 후)
const getBookById = useCallback(async (id: string) => {
  ...
}, []); // setIsLoading, setError는 React가 안정적 참조를 보장 → deps 불필요
```

```tsx
// ✅ edit/page.tsx (수정 후)
useEffect(() => {
  getBookById(id); // 이제 참조가 고정 → 무한루프 없음
}, [id, getBookById]); // eslint-disable 주석 없이도 OK
```

---

### useCallback 사용 기준 — 딱 2가지 상황

```
1. useEffect deps에 함수를 넣어야 할 때
   → 넣지 않으면 stale closure, 넣으면 무한루프 → useCallback으로 참조 고정

2. React.memo로 감싼 자식 컴포넌트에 함수 prop을 내려줄 때
   → useCallback 없으면 부모 렌더링마다 새 참조 → 자식 메모이제이션 무효화
```

**useCallback이 필요 없는 상황:**

```tsx
// 이벤트 핸들러는 useCallback 불필요 (렌더마다 JSX에 새로 바인딩되어도 문제 없음)
const handleClick = () => setCount(c => c + 1); // 그냥 써도 됨

// 렌더 함수 내부에서만 쓰는 함수도 불필요
const formatDate = (date) => date.toLocaleDateString(); // 그냥 써도 됨
```

**판단 기준 한 줄 요약:**

> 함수가 `useEffect deps`에 들어가거나, `React.memo` 자식에게 prop으로 전달되면 `useCallback`. 그 외엔 불필요.

---

## 의존성 배열을 속이면 안 되는 이유

Day 10에서 배운 **stale closure** 문제가 여기서도 똑같이 발생한다.

```tsx
const [count, setCount] = useState(0);

// ❌ 의존성 배열 조작 — eslint-disable로 경고 무시
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // 항상 0 출력 (클로저에 갇힌 값)
    //          ^^^^^ 처음 렌더링 시점의 count = 0을 기억
  }, 1000);
  return () => clearInterval(id);
}, []); // count를 빼버림 → stale closure 버그
```

effect는 자신이 실행된 **렌더링 시점의 값**을 기억한다.
의존성 배열이 빈 배열이면 → 첫 렌더링의 값을 영원히 기억 → stale closure.

```tsx
// ✅ 올바름
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // 항상 최신 count
  }, 1000);
  return () => clearInterval(id);
}, [count]); // count 포함 → 바뀔 때마다 재실행
```

---

## 의존성 배열을 줄이는 올바른 방법

의존성이 너무 많아 불편하면 **배열을 조작하는 게 아니라 effect 구조를 바꿔야** 한다.

```tsx
// 😰 의존성이 너무 많음
useEffect(() => {
  setSomething(a + b + c);
}, [a, b, c]);

// ✅ 방법 1: 파생 상태로 계산 (effect 자체가 필요 없음)
const something = a + b + c; // 그냥 렌더 시 계산

// ✅ 방법 2: setState의 함수형 업데이트로 의존성 줄이기
useEffect(() => {
  setCount(prev => prev + 1); // count를 의존성에서 제거 가능
}, [trigger]);
```

---

## 정리

| 의존성 배열 | 실행 시점 |
|---|---|
| 없음 | 매 렌더링 |
| `[]` | 마운트 1회 |
| `[값]` | 마운트 + 값이 바뀔 때마다 |

**규칙 하나**:

> effect 안에서 사용하는 모든 값(state, props, 함수)은 의존성 배열에 넣는다.
> 배열을 줄이고 싶으면 effect 구조를 바꾼다. 배열을 속이지 않는다.

---

## 오늘 실험

1. [useNotificationRealtime.ts:68](../apps/page0127/src/entities/notification/lib/hooks/useNotificationRealtime.ts#L68)에서 `userId`를 배열에서 제거하면 어떤 버그가 생기는지 생각해보기
2. [BookSearchInput.tsx:44](../apps/page0127/src/features/stats/ui/BookSearchInput.tsx#L44)에서 `onSearchChange`를 배열에서 제거하면? → 부모가 함수를 바꿔도 반응 안 함

---

## 다음 Day 16

useEffect 클린업 — 구독/타이머/이벤트를 정리하지 않으면 생기는 메모리 누수
