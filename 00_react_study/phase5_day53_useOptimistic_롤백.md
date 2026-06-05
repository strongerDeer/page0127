# Phase 5 · Day 53 — useOptimistic 심화 (실패 시 롤백)

> Day 52는 "성공하면 그대로 유지". 오늘은 **네트워크가 터졌을 때** 원래 값으로 돌아오는 길.
> 핵심 반전: `useOptimistic`은 "실패해서 되돌린다"가 아니라 **기준 상태를 안 건드렸으니 그냥 사라진다**.
> 그래서 롤백 코드가 없는 게 아니라, **롤백이라는 개념 자체가 없다.**

---

## 0. 용어 정리 — "낙관적"이 뭔데?

`useOptimistic`의 **Optimistic = 낙관적**. 어원으로 풀면 한 방에 이해된다.

| 방식 | 뜻 | 동작 |
| --- | --- | --- |
| **낙관적(optimistic)** | "당연히 성공하겠지" | 서버 응답을 **안 기다리고** UI를 먼저 바꾼다 |
| **비관적(pessimistic)** | "혹시 실패할라" | 서버 응답을 **받고 나서** UI를 바꾼다 (스피너 후 갱신) |

`useOptimistic`은 이 "미리 칠해두기"를 React 19가 **표준 훅**으로 만든 것. 원래 손으로 하던 패턴이다.

### ⚠️ "좋아요면 무조건 useOptimistic" — 아니다

좋아요라고 다 같은 게 아니다. **상태가 어디까지 퍼져 있냐**로 갈린다.

| page0127 버튼 | 상태 성격 | 정답 도구 |
| --- | --- | --- |
| **BookLikeButton** (책 좋아요) | 그 카드 안에서만 쓰는 로컬 `useState` | ✅ **useOptimistic** |
| **LikeButton** (활동 좋아요) | 피드 + 상세 **두 화면이 공유**하는 서버 캐시 | ✅ **React Query 스냅샷** |

> 한 컴포넌트로 끝나는 즉각 피드백 → `useOptimistic` / 여러 화면이 공유하는 서버 상태 → React Query.
> **둘은 경쟁이 아니라 역할 분담.** (자세한 이유는 §3 함정 ②)

---

## 1. 오늘 읽을 코드

- [LikeButton.tsx](../apps/page0127/src/features/like/ui/LikeButton.tsx) — React Query 스냅샷 롤백 (`onError`)
- [BookLikeButton.tsx](../apps/page0127/src/widgets/book/ui/BookLikeButton.tsx) — useState 수동 되돌리기 (`onError`)

---

## 2. 핵심 개념 — 롤백의 세 가지 결

### (A) useState 수동 토글 — "두 번 뒤집기"

```tsx
onMutate: () => setLiked((prev) => !prev),   // 켰다가
onError:  () => setLiked((prev) => !prev),   // 다시 끈다 (사람이 책임)
```

상태를 **진짜로** 바꿔놨기 때문에, 실패하면 **사람이 직접** 반대로 한 번 더 뒤집어야 한다.

### (B) React Query 스냅샷 복구 — "사진 찍고 되돌리기"

```tsx
onMutate: async () => {
  const previous = queryClient.getQueryData(key); // 변경 전 사진
  queryClient.setQueryData(key, /* toggle */);    // 캐시 변경
  return { previous };
},
onError: (_e, _v, ctx) => queryClient.setQueryData(key, ctx.previous), // 사진으로 복원
```

캐시(서버 상태)를 진짜로 바꿔놨으니, 실패 시 **찍어둔 스냅샷**으로 되돌린다.

### (C) useOptimistic — "되돌릴 게 없다"

```tsx
const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked); // liked = 기준

const onClick = () =>
  startTransition(async () => {
    setOptimisticLiked(!liked);     // 임시 오버레이만 ON
    await toggleLikeAction();       // 실패하면 여기서 throw
    // 성공/실패 무관 → transition 끝나면 오버레이 폐기, 화면은 liked로 복귀
  });
```

- **성공**: 서버가 실제 `liked`를 ON으로 갱신 → 복귀해도 ON
- **실패**: 실제 `liked`는 **처음부터 안 바뀜** → 복귀하면 자동으로 OFF

> 되돌리는 코드가 없는 이유: 기준 상태를 안 건드렸으니 **돌아올 곳이 항상 원래 자리**다.
> (A)·(B)는 "바꿨다가 되돌리기", (C)는 **"덧칠했다가 지우기"**.

---

## 3. ⚠️ useOptimistic 롤백의 함정 2가지

자동 복귀는 편하지만, **공짜로 다 되는 게 아니다.**

### 함정 ① — 실패를 사용자에게 알리려면 try/catch가 필수

`useOptimistic`은 성공/실패를 **구분하지 않는다.** 둘 다 똑같이 "오버레이 폐기"일 뿐.
그래서 실패 토스트는 직접 잡아야 한다.

```tsx
startTransition(async () => {
  setOptimisticLiked(!liked);
  try {
    await toggleLikeAction();
  } catch {
    toast.error('좋아요 처리에 실패했습니다.'); // 자동 복귀 + 알림은 별개
  }
});
```

> 화면은 알아서 돌아오지만, **"왜 돌아왔는지"는 안 알려준다.** 알림은 여전히 내 몫.

### 함정 ② — 여러 화면이 공유하는 상태는 못 되돌린다

`useOptimistic`은 **그 컴포넌트 안에서만** 임시값을 덧칠한다.
page0127의 `LikeButton`처럼 같은 좋아요가 **피드 + 상세 두 캐시**에 걸쳐 있으면,
한 컴포넌트의 오버레이로는 다른 화면을 못 건드린다 → 여기선 **React Query (B) 방식이 정답**.

---

## 4. page0127 실제 코드 — 실패 경로만 비교

| 컴포넌트 | 실패 시(`onError`) 하는 일 | 되돌리는 대상 |
| --- | --- | --- |
| `BookLikeButton` | `setLiked((prev) => !prev)` 한 줄 | 컴포넌트 로컬 `useState` |
| `LikeButton` | `setQueryData(key, ctx.previous)` ×2 | 피드·상세 **두 캐시** |

```tsx
// BookLikeButton — 로컬 상태라 한 줄로 끝
onError: () => {
  setLiked((prev) => !prev);
  toast.error('좋아요 처리 중 오류가 발생했습니다.');
},

// LikeButton — 공유 캐시라 스냅샷 2개를 각각 복원
onError: (_error, _v, context) => {
  if (context?.previousFeeds)  queryClient.setQueryData(activityKeys.feeds(), context.previousFeeds);
  if (context?.previousDetail) queryClient.setQueryData(activityKeys.detail(activityId), context.previousDetail);
  toast.error('좋아요 처리에 실패했습니다.');
},
```

> 두 코드 모두 **toast는 직접** 띄운다. → `useOptimistic`으로 바꿔도 이 줄은 안 사라진다(함정 ①).
> 사라지는 건 오직 `setLiked((prev) => !prev)` / `setQueryData(...previous)` **되돌리기 줄**뿐.

---

## 5. ✅ 오늘 실습 — BookLikeButton을 useOptimistic으로 변환

실제로 [BookLikeButton.tsx](../apps/page0127/src/widgets/book/ui/BookLikeButton.tsx)를 바꿨다.
React Query `useMutation`을 걷어내고 `useOptimistic + useTransition`으로 전환.

### Before — useMutation (수동 롤백)

```tsx
const [liked, setLiked] = useState(initialLiked);
const { mutate, isPending } = useMutation({
  mutationFn: () => bookApi.toggleLike(bookId),
  onMutate: () => setLiked((prev) => !prev),         // 켜고
  onSuccess: (data) => { setLiked(data.liked); router.refresh(); },
  onError: () => {
    setLiked((prev) => !prev);                        // ← 실패 시 직접 되돌림
    toast.error('좋아요 처리 중 오류가 발생했습니다.');
  },
});
// 화면엔 liked 를 그린다
```

### After — useOptimistic (자동 복귀)

```tsx
const [liked, setLiked] = useState(initialLiked);
const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked); // 오버레이
const [isPending, startTransition] = useTransition();

const handleToggle = () =>
  startTransition(async () => {            // ⚠️ optimistic 갱신은 transition 안에서
    setOptimisticLiked(!liked);            // 즉시 토글 (서버 응답 전)
    try {
      const data = await bookApi.toggleLike(bookId);
      setLiked(data.liked);                // 성공: 기준 상태 갱신
      router.refresh();
    } catch {
      toast.error('좋아요 처리 중 오류가 발생했습니다.'); // 되돌리기 줄 없음!
    }
  });
// 화면엔 optimisticLiked 를 그린다  ← liked 가 아니다!
```

### 정확히 무엇이 바뀌었나

| 항목 | Before | After |
| --- | --- | --- |
| 실패 롤백 | `setLiked((prev) => !prev)` **직접** | **삭제** (자동 복귀) |
| pending 표시 | `useMutation`의 `isPending` | `useTransition`의 `isPending` |
| 화면에 그리는 값 | `liked` | `optimisticLiked` |
| 실패 toast | 직접 | 직접 (그대로 — 자동 아님) |

> 실제로 사라진 건 딱 한 줄, `onError`의 수동 토글. **toast 줄은 그대로 남았다**(§3 함정 ①).
> 실수 주의 ①: 화면에 `liked`를 그대로 그리면 낙관적 반영이 안 됨 → 반드시 `optimisticLiked`.
> 실수 주의 ②: `setOptimisticLiked`를 transition 밖에서 부르면 런타임 에러.

---

## 6. 정리

| 방식 | 실패 롤백 | 알림(toast) | 여러 화면 공유 |
| --- | --- | --- | --- |
| useState (A) | 수동 (반대로 toggle) | 직접 | ❌ |
| React Query (B) | 수동 (스냅샷 복원) | 직접 | ✅ |
| useOptimistic (C) | **자동** (오버레이 폐기) | **직접 (try/catch)** | ❌ |

> **규칙 1줄**: `useOptimistic`은 *되돌리는 코드*를 없애줄 뿐, *실패를 알리는 코드*는 못 없앤다 —
> 그리고 여러 화면이 얽힌 서버 상태엔 여전히 React Query 스냅샷이 맞다.

---

## 7. 오늘 실험 (2가지)

1. **✅ BookLikeButton 변환 (§5에서 완료)** — 직접 실패를 재현해보자. 브라우저 DevTools →
   Network → **Offline**으로 두고 하트 클릭 → ① 즉시 빨개졌다가 ② 잠시 후 원래대로 **자동 복귀** +
   ③ 에러 토스트가 뜨는지 확인. "복귀(자동)와 알림(수동)이 별개"임을 눈으로 본다.

2. **자동 복귀 vs 알림 분리 데모** — 작은 파일에서 `setOptimistic(!v)` 후
   `throw new Error()`를 일부러 던져보기. 화면은 원래 값으로 **돌아오지만 아무 메시지도 안 뜨는 것**을
   확인 → `try/catch`로 `console.warn`을 붙여 "복귀와 알림은 별개"를 체감.

---

## 8. 다음 Day 예고

**Day 54 — `use()`**: Supabase Promise를 `use()`로 풀어 **Suspense와 함께** 선언적으로 로딩한다.
낙관적 업데이트(쓰기)에서 → 데이터 읽기의 새 문법으로 넘어간다.
