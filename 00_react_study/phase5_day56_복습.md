# Day 56 — Phase 5 복습: React 19로 무엇이 단순해졌나

> Phase 5 마무리 · 적용 전/후 diff 비교
> 한 줄 요약: **React 19의 새 훅들은 "직접 손으로 관리하던 상태(로딩·에러·롤백)를 React에 위임"하게 해준다.**

---

## 1. Phase 5에서 배운 것 (한눈에)

| Day | 기능 | 핵심 역할 | page0127 실제 코드 |
|---|---|---|---|
| 50–51 | `useActionState` | 폼 제출의 상태(idle/pending/error)를 한 훅으로 | [updateReadingGoalAction.ts](apps/page0127/src/features/profile/api/updateReadingGoalAction.ts) |
| 52–53 | `useOptimistic` | 서버 응답 전 즉시 UI 반영 + 자동 롤백 | [BookLikeButton.tsx](apps/page0127/src/widgets/book/ui/BookLikeButton.tsx) |
| 54 | `use()` | client에서 Promise를 기다리는 `await` 대체 | (page0127 미적용 — 개념만) |
| 55 | Server Actions | 클라이언트에서 호출하는 서버 함수 | [updateReadingGoalAction.ts](apps/page0127/src/features/profile/api/updateReadingGoalAction.ts) |

---

## 2. 전/후 diff 비교 — "손으로 하던 걸 React가 대신"

### (A) `useOptimistic` — 롤백 코드가 통째로 사라진다

가장 극적인 단순화. **실패 시 복구 코드**를 비교해보자.

**Before — React Query 방식** ([LikeButton.tsx](apps/page0127/src/features/like/ui/LikeButton.tsx)):
```tsx
onMutate: async (currentlyLiked) => {
  const previousFeeds = queryClient.getQueryData(...);   // ① 스냅샷 저장
  const previousDetail = queryClient.getQueryData(...);
  queryClient.setQueryData(..., toggle);                  // ② 낙관적 수정
  return { previousFeeds, previousDetail };
},
onError: (_e, _v, context) => {
  queryClient.setQueryData(..., context.previousFeeds);  // ③ 수동 롤백
  queryClient.setQueryData(..., context.previousDetail);
},
```

**After — useOptimistic 방식** ([BookLikeButton.tsx](apps/page0127/src/widgets/book/ui/BookLikeButton.tsx)):
```tsx
const [liked, setLiked] = useState(initialLiked);
const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

startTransition(async () => {
  setOptimisticLiked(!liked);          // ① 즉시 토글
  try {
    const data = await bookApi.toggleLike(bookId);
    setLiked(data.liked);              // ② 성공: 기준값 갱신
  } catch {
    toast.error('...');               // ③ 실패: 롤백 코드 없음!
  }                                    //   기준값(liked)을 안 건드렸으니 자동 복귀
});
```

> **차이**: 스냅샷 저장 → 실패 시 수동 복구 3줄이 **0줄**이 된다. `liked`를 안 건드리면 transition이 끝날 때 `optimisticLiked`가 알아서 원래 값으로 돌아온다.

### (B) `useActionState` — 로딩/에러 useState가 사라진다

**Before (전형적 패턴)**:
```tsx
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsPending(true);
  try { await save(...); }
  catch { setError('실패'); }
  finally { setIsPending(false); }
};
```

**After**:
```tsx
// 액션이 (이전상태, FormData) => 다음상태 → 상태 관리가 액션 안으로
const [state, formAction, isPending] = useActionState(updateReadingGoalAction, {
  status: 'idle', message: '',
});
// <form action={formAction}> 하면 e.preventDefault·FormData 수집도 자동
```

> **차이**: `isPending`/`error` useState 2개 + try/finally가 **훅 한 줄 + 액션 함수**로 흡수된다.

### (C) Server Actions — API 라우트가 사라진다

**Before**: `/api/reading-goal/route.ts` 만들기 → 클라에서 `fetch('/api/...')` → 응답 파싱 → 타입 수동 정의

**After**: `'use server'` 함수 하나. 클라에서 함수처럼 호출. 타입은 시그니처로 자동.

### (D) `use()` — (page0127 미적용) prop 내리기 대신 Suspense 위임

**Before**: 서버에서 `await` → 로딩은 부모가 관리 → prop으로 깊이 내림
**After**: 서버는 Promise만 넘김 → client가 `use(promise)` → 로딩은 `<Suspense>`가 처리

---

## 3. 가장 중요한 통찰 — 새 훅이 "항상" 정답은 아니다

page0127은 좋아요를 **두 가지로 나눠** 구현했다. [LikeButton.tsx의 주석](apps/page0127/src/features/like/ui/LikeButton.tsx#L36-L41)이 핵심:

| | 쓰는 곳 | 도구 | 왜 |
|---|---|---|---|
| 활동 좋아요 | 피드 + 상세 **두 화면 공유** | React Query | 여러 화면 캐시를 동시에 맞춰야 함 |
| 책 좋아요 | **한 카드 안에서만** | `useOptimistic` | 로컬 오버레이로 충분, 롤백 코드 0 |

> **규칙: 즉각 피드백(로컬) = `useOptimistic` / 여러 화면 공유(서버 상태) = React Query.**
> useOptimistic은 "그 컴포넌트 안에서만" 임시값을 덧칠하므로, 다른 화면 캐시는 못 건드린다.

---

## 4. Phase 5 한 장 요약

| 하고 싶은 일 | 도구 |
|---|---|
| 폼 제출 + 서버 검증·보안 | Server Action + `useActionState` |
| 한 컴포넌트 안 즉각 반응 | `useOptimistic` |
| 여러 화면이 공유하는 서버 상태 | React Query (`useMutation`) |
| client에서 비동기 데이터 기다리기 | `use()` |
| 서버에서 데이터 읽기 | `await` (Server Component) |

---

## 5. 오늘 실험 (2가지)

### 실험 1 — "이 코드, 뭘로 단순화?" 매칭

아래 Before를 보고 어떤 React 19 기능을 떠올릴지:

1. `try/catch`로 스냅샷 저장하고 실패 시 되돌리는 코드 → ?
2. `useState(false)` loading + `try/finally` 폼 제출 → ?
3. `/api/...` 라우트 만들고 `fetch` 하는 코드 → ?

> 답: 1) `useOptimistic` 2) `useActionState` 3) Server Action

### 실험 2 — 역할 분담 판단

"댓글 좋아요"를 만든다면 `useOptimistic`? React Query? **판단 기준 한 줄**로 답하고,
그 이유를 LikeButton 주석과 비교해보기. (힌트: 그 좋아요가 **몇 개 화면에서 공유**되나?)

---

## 6. 다음 단계 예고 — Phase 6 시작

**Day 57 — useTransition 심화**: 대량의 완독 책 목록을 렌더링할 때 입력 응답성이 끊기지 않도록 `useTransition`으로 우선순위를 낮춘다. Phase 5가 "데이터 흐름"이었다면, Phase 6은 **성능·동시성**이다.
