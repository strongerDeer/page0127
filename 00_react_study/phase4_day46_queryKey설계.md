# Day 46 — TanStack Query: queryKey 설계

> Phase 4 · 주제: queryKey 네이밍 컨벤션 통일
> 연결 포인트: 현재 `useQuery` 패턴 전수 조사 → Query Key Factory 패턴 도입

---

## 1. 오늘 읽을 코드

- [book/model/queryKeys.ts](../apps/page0127/src/entities/book/model/queryKeys.ts) — 잘 설계된 Factory
- [notification/model/queryKeys.ts](../apps/page0127/src/entities/notification/model/queryKeys.ts) — 같은 패턴
- 인라인 키 사용처: [ActivityFeed.tsx](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx#L30), [CommentSection.tsx](../apps/page0127/src/features/comment/ui/CommentSection.tsx#L40), [FollowButton.tsx](../apps/page0127/src/features/follow/ui/FollowButton.tsx#L35)

---

## 2. 핵심 개념

### queryKey는 "캐시의 주소"다

TanStack Query는 `queryKey`를 **직렬화(serialize)** 해서 캐시를 식별한다.
키가 같으면 같은 캐시, 키 일부만 달라도 다른 캐시다.

```ts
['comments', activityId]   // activityId마다 별도 캐시
['comments']               // 위 캐시들의 "상위" — 무효화 시 전부 날림
```

### 계층 구조 (hierarchy)가 중요한 이유

`invalidateQueries`는 **부분 일치(prefix match)** 로 동작한다.

```ts
// ['follow', 'isFollowing', userId] 와 ['follow', 'stats', userId] 둘 다
queryClient.invalidateQueries({ queryKey: ['follow'] }); // → 전부 무효화됨
```

→ `[도메인, 종류, 파라미터]` 순서로 **넓은 것 → 좁은 것** 으로 배열을 쌓으면
무효화 범위를 자유롭게 조절할 수 있다.

### Query Key Factory 패턴

키를 문자열로 직접 쓰면 **오타·중복·범위 무효화 누락**이 생긴다.
객체 하나에 모아두고 함수로 생성한다.

```ts
export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  detail: (id: string) => [...bookKeys.all, 'detail', id] as const,
} as const;
```

`as const`로 튜플 타입을 고정해 타입 안전성까지 확보한다.

---

## 3. page0127 실제 코드 사례

### ✅ 잘 된 것 — Factory 사용 (book, notification)

```ts
// book/model/queryKeys.ts
export const bookKeys = {
  all: ['books'] as const,
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (filters?) => [...bookKeys.lists(), filters] as const,
  details: () => [...bookKeys.all, 'detail'] as const,
  detail: (id) => [...bookKeys.details(), id] as const,
} as const;
```

→ `lists()`가 `all`을 포함하고, `list(filters)`가 다시 `lists()`를 포함한다.
계층이 자연스럽게 중첩되어 어느 레벨에서든 무효화가 깔끔하다.

### ⚠️ 통일이 안 된 것 — 인라인 문자열 배열

전수 조사 결과 feature 레이어는 키를 직접 쓰고 있다:

| 위치 | 현재 queryKey |
| --- | --- |
| ActivityFeed | `['feed', 'activities']` |
| LikeButton | `['feed', 'activities']` (수동 중복) |
| CommentSection / List / Item / Form | `['comments', activityId]` (4곳 반복) |
| FollowButton | `['follow', 'isFollowing', userId]` |
| FollowStats | `['follow', 'stats', userId]` |
| UserSearch | `['users', 'search', activeQuery]` |
| CalendarBlock | `['calendar', year, month]` |

문제점:
- `['comments', activityId]`가 **4개 파일에 흩어져** 있어 오타 한 글자면 캐시가 어긋난다.
- `['feed', 'activities']`를 LikeButton이 무효화하려고 손으로 똑같이 적었다 → 둘 중 하나만 바뀌면 버그.

→ `commentKeys`, `feedKeys`, `followKeys` 처럼 각 entity에 factory를 만들어 통일하면 해결.

---

## 4. 규칙 1줄

> **queryKey는 entity의 `model/queryKeys.ts`에 Factory로 모으고, `[도메인 → 종류 → 파라미터]` 계층으로 `as const` 배열을 쌓는다.**

---

## 5. 오늘 실험 (2가지)

1. **commentKeys 만들어보기**
   `entities/comment/model/queryKeys.ts`를 새로 만들고, 흩어진 `['comments', activityId]` 4곳을 `commentKeys.list(activityId)`로 교체. 무효화도 `commentKeys.list(activityId)`로 통일.

2. **무효화 범위 실험**
   FollowButton에서 `invalidateQueries({ queryKey: ['follow'] })` (넓음) 와
   `invalidateQueries({ queryKey: ['follow', 'isFollowing', userId] })` (좁음) 의 차이를
   DevTools Query 탭에서 어떤 쿼리가 `stale`이 되는지 비교 관찰.

---

## 6. 다음 Day 예고

**Day 47 — TanStack Query: mutation**
`useMutation` + optimistic update. 좋아요 클릭 시 서버 응답 전에 UI를 먼저 바꾸고,
실패하면 롤백하는 패턴. 오늘 만든 queryKey factory가 무효화·롤백에서 그대로 쓰인다.
