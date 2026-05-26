# Day 47 — TanStack Query: `useMutation` & Optimistic Update

> 주제: 데이터를 **변경**하는 요청을 어떻게 다루고, 결과를 기다리지 않고 UI를 즉시 반영하는가
> 연결 포인트: 좋아요 클릭 즉시 반영

---

## 1. 오늘 읽을 코드

- [LikeButton.tsx](../apps/page0127/src/features/like/ui/LikeButton.tsx) — 로컬 상태 기반 낙관적 업데이트
- [FollowButton.tsx](../apps/page0127/src/features/follow/ui/FollowButton.tsx) — invalidate 기반 (낙관적 X)

두 컴포넌트는 같은 "토글 액션"인데 **전략이 다르다.** 이 차이가 오늘의 핵심.

---

## 2. 핵심 개념

### `useMutation` 기본 구조

`useQuery`가 **읽기**라면 `useMutation`은 **쓰기**(POST/PUT/DELETE).
자동 실행되지 않고 `.mutate()`를 호출해야 동작한다.

```ts
const m = useMutation({
  mutationFn: (vars) => api.doSomething(vars), // 실제 요청
  onMutate,   // 요청 직전 (낙관적 업데이트 시작)
  onError,    // 실패 → 롤백
  onSuccess,  // 성공 → 후속 처리
  onSettled,  // 성공/실패 무관하게 항상 (보통 invalidate)
});

m.mutate(vars); // 실행 트리거
```

콜백 실행 순서: **onMutate → (요청) → onError 또는 onSuccess → onSettled**

### Optimistic Update(낙관적 업데이트)란

서버 응답을 **기다리지 않고** "성공할 것"이라 가정해 UI를 먼저 바꾼다.
실패하면 되돌린다(rollback). 좋아요·팔로우처럼 **거의 항상 성공하는** 액션에 적합.

구현 방식은 크게 2가지:

| 방식 | 상태 보관 위치 | 롤백 방법 |
| --- | --- | --- |
| **로컬 상태** | `useState` | onError에서 setState 원복 |
| **캐시 직접 수정** | QueryClient 캐시 | onMutate가 반환한 snapshot으로 복구 |

---

## 3. page0127 실제 사례

### 사례 A — LikeButton: 로컬 상태 낙관적 업데이트

```ts
const [count, setCount] = useState(initialCount);
const [isLiked, setIsLiked] = useState(initialIsLiked);

const likeMutation = useMutation({
  mutationFn: async (currentlyLiked: boolean) => {
    if (currentlyLiked) await likeApi.removeLike(activityId);
    else await likeApi.addLike(activityId);
  },
  // ① 요청 직전 UI 즉시 반영
  onMutate: (currentlyLiked) => {
    setIsLiked(!currentlyLiked);
    setCount((prev) => (currentlyLiked ? prev - 1 : prev + 1));
  },
  // ② 실패 시 원상 복구
  onError: (_e, currentlyLiked) => {
    setIsLiked(currentlyLiked);
    setCount((prev) => (currentlyLiked ? prev + 1 : prev - 1));
    toast.error('좋아요 처리에 실패했습니다.');
  },
  // ③ 성공 시 피드만 갱신
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
  },
});
```

**포인트**: 좋아요 상태/카운트를 `useState`로 들고 있어서, `onMutate`에서 즉시 바꾸고 `onError`에서 반대로 되돌린다. props로 초기값을 받아 추가 조회 없이 시작한다.

### 사례 B — FollowButton: invalidate-only (낙관적 X)

```ts
const { data: isFollowing = false } = useQuery({
  queryKey: followKeys.isFollowing(userId),
  queryFn: () => followApi.isFollowing(userId),
});

const followMutation = useMutation({
  mutationFn: () => followApi.followUser({ following_id: userId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: followKeys.all }); // 응답 후 재조회
    toast.success('팔로우했습니다.');
  },
  onError: (error) => toast.error(error.response?.data?.error ?? '팔로우 실패'),
});
```

**포인트**: `onMutate`가 **없다.** 버튼 누름 → 서버 응답 → invalidate → 재조회 → 그제서야 UI 변경.
정확하지만 **응답까지 깜빡임/딜레이**가 있다. (`isPending`으로 스피너를 돌려 가린다)

---

## 4. 정리

| 항목 | LikeButton | FollowButton |
| --- | --- | --- |
| 낙관적 업데이트 | ✅ (로컬 상태) | ❌ |
| 즉시 반영 | 클릭 즉시 | 응답 후 |
| 실패 복구 | onError setState 롤백 | invalidate가 알아서 |
| 적합한 곳 | 빈번/저위험 액션 | 정확성이 더 중요한 액션 |

> **규칙 1줄**: 자주 누르고 실패가 드문 액션은 낙관적 업데이트로 즉시 반영하고, `onError`에 반드시 롤백을 짝지어 둔다.

---

## 5. 오늘 실험 (2가지)

### 실험 1 — FollowButton을 캐시 기반 낙관적 업데이트로 바꿔 보기

`onMutate`에서 `isFollowing` 캐시를 직접 뒤집고, 실패 시 snapshot으로 복구하는 **정석 패턴**을 연습:

```ts
onMutate: async () => {
  const key = followKeys.isFollowing(userId);
  await queryClient.cancelQueries({ queryKey: key }); // 진행 중 refetch 취소 (덮어쓰기 방지)
  const prev = queryClient.getQueryData(key);          // 롤백용 snapshot
  queryClient.setQueryData(key, true);                 // 즉시 true로
  return { prev };                                     // context로 전달
},
onError: (_e, _v, ctx) => {
  queryClient.setQueryData(followKeys.isFollowing(userId), ctx?.prev); // 복구
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: followKeys.isFollowing(userId) }); // 최종 동기화
},
```

> LikeButton의 `useState` 방식과 비교: **여러 컴포넌트가 같은 캐시를 공유**할 때는 캐시 직접 수정이 더 일관적이다.

### 실험 2 — `cancelQueries`를 일부러 빼 보기

`onMutate`에서 `cancelQueries`를 제거한 뒤, 좋아요를 빠르게 연타해 본다.
진행 중이던 refetch 응답이 낙관적 값을 **덮어써서** UI가 잠깐 튀는 현상을 관찰 → 왜 `cancelQueries`가 필요한지 체감한다.

---

## 6. 다음 Day 예고

**Day 48 — `useInfiniteQuery` 무한 스크롤**: 책 목록을 페이지 단위로 끊어 가져오고, 스크롤 끝에서 다음 페이지를 자동 로드한다. mutation에서 다룬 캐시 구조가 무한 쿼리에서 어떻게 페이지 배열로 쌓이는지 본다.
