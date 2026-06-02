# Phase 5 · Day 52 — useOptimistic (낙관적 업데이트)

> 좋아요 버튼을 누르면 **서버 응답을 기다리지 않고** 하트가 즉시 채워진다.
> React 19의 `useOptimistic`은 이 "임시 UI"를 표준 훅으로 만들어준다.
> Day 51의 "응답 후 상태 반영"과 정반대 방향이다.

---

## 1. 오늘 읽을 코드

- [LikeButton.tsx](../apps/page0127/src/features/like/ui/LikeButton.tsx) — 활동 좋아요 (React Query 캐시 직접 수정)
- [BookLikeButton.tsx](../apps/page0127/src/widgets/book/ui/BookLikeButton.tsx) — 책 좋아요 (useState 토글)

---

## 2. 핵심 개념

### useOptimistic — "임시 오버레이" 상태

```tsx
const [optimistic, addOptimistic] = useOptimistic(
  actualState,                   // ① 실제(기준) 상태
  (current, input) => nextState  // ② 낙관적 업데이트 함수
);
```

- `optimistic` : 화면에 그릴 값 (평소엔 `actualState`와 같음)
- `addOptimistic(input)` : 호출하는 **즉시** `optimistic`이 바뀜
- **action/transition이 끝나면** `optimistic`은 버려지고 다시 `actualState`로 **자동 복귀**

> 핵심: 기준 상태(`actualState`)는 건드리지 않는다. 낙관적 값은 비동기 작업이 도는
> 동안만 임시로 "덧칠"되고, 끝나면 사라진다.

### 왜 롤백 코드가 줄어드나

```tsx
const toggleLike = () => {
  startTransition(async () => {
    addOptimistic(!liked);     // 즉시 하트 ON (서버 응답 전)
    await toggleLikeAction();  // 서버 처리
    // 끝 → optimistic 폐기, 화면은 실제 liked 기준으로 복귀
  });
};
```

- **성공**: 서버가 실제 `liked`를 갱신 → 복귀해도 ON 유지
- **실패**: 실제 `liked`는 안 바뀜 → 복귀하면 **자동으로 원래 값(OFF)** 표시
  → `onError`에서 수동으로 되돌리는 코드가 (거의) 불필요

---

## 3. page0127 실제 코드 사례 (현재 방식 = useOptimistic 없이)

page0127은 아직 `useOptimistic`을 쓰지 않고 **TanStack Query로 낙관적 업데이트**를 한다.
두 가지 결이 다른 구현이 있다.

### (A) BookLikeButton — useState + 수동 롤백

[BookLikeButton.tsx](../apps/page0127/src/widgets/book/ui/BookLikeButton.tsx)

```tsx
const [liked, setLiked] = useState(initialLiked);

const { mutate, isPending } = useMutation({
  mutationFn: () => bookApi.toggleLike(bookId),
  onMutate: () => setLiked((prev) => !prev), // 즉시 토글 (낙관적)
  onSuccess: (data) => { setLiked(data.liked); router.refresh(); },
  onError: () => {
    setLiked((prev) => !prev); // ← 실패 시 직접 되돌림
    toast.error('좋아요 처리 중 오류가 발생했습니다.');
  },
});
```

> `useOptimistic`이라면 `onError`의 수동 되돌리기가 사라진다 — 실제 `liked`가 안 바뀌면
> transition 종료 시 자동 복귀하기 때문. (이 비교가 오늘의 핵심)

### (B) LikeButton — React Query 캐시 직접 수정 (정석)

[LikeButton.tsx](../apps/page0127/src/features/like/ui/LikeButton.tsx)

```tsx
onMutate: async (currentlyLiked) => {
  await queryClient.cancelQueries({ queryKey: activityKeys.feeds() });
  const previousFeeds = queryClient.getQueryData(activityKeys.feeds()); // 롤백 스냅샷
  queryClient.setQueryData(activityKeys.feeds(), (old) => /* toggle */);  // 캐시 뒤집기
  return { previousFeeds };
},
onError: (_e, _v, context) => {
  queryClient.setQueryData(activityKeys.feeds(), context.previousFeeds); // 스냅샷 복구
},
onSettled: () => queryClient.invalidateQueries({ queryKey: activityKeys.feeds() }),
```

> 같은 활동이 **피드 + 상세 두 캐시**에 있어 둘 다 수정한다. 이건 *서버 상태(여러 화면 공유)*
> 의 낙관적 업데이트라 `useOptimistic`(컴포넌트 로컬)보다 React Query가 더 맞다.

---

## 4. 정리

| 구분 | React Query `onMutate` | `useOptimistic` (React 19) |
| --- | --- | --- |
| 적용 대상 | **서버 상태**(여러 화면 공유 캐시) | **컴포넌트 로컬** 임시 표시 |
| 기준 상태 | 캐시를 직접 수정 | 안 건드림 (임시 오버레이만) |
| 실패 롤백 | 스냅샷/되돌리기 **직접** | 복귀 시 **자동** (대체로) |
| 짝꿍 | mutation 라이프사이클 | Server Action / `startTransition` |

> **규칙 1줄**: 여러 화면이 공유하는 서버 상태는 React Query 캐시로, 한 컴포넌트의 즉각 피드백은 `useOptimistic`으로 — 둘은 경쟁이 아니라 역할 분담이다.

---

## 5. 오늘 실험 (2가지)

1. **BookLikeButton을 머릿속으로 `useOptimistic`화** — `onMutate`/`onError`의 수동
   토글 2줄이 `useOptimistic` + `startTransition`에서 어떻게 사라지는지 종이에 변환해보기.
   (실제 코드 변경 없이 구조만 — Day 53에서 실패 롤백까지 다룸)

2. **자동 복귀 관찰 실험** — `useOptimistic` 데모를 작은 파일로 만들어
   `addOptimistic` 후 `await new Promise(r => setTimeout(r, 1500))`만 하고 **실제 상태를
   안 바꾸면**, 1.5초 뒤 화면이 원래 값으로 돌아오는지 확인. (자동 복귀 체감)

---

## 6. 다음 Day 예고

**Day 53 — useOptimistic 심화**: 네트워크 오류 시 **롤백** 처리. 오늘 "자동 복귀"가
실패 케이스에서 정확히 어떻게 동작하는지, 그리고 `useOptimistic`만으로 부족한 지점을
짚는다.
