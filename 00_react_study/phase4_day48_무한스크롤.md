# Day 48 — TanStack Query 무한 스크롤 (`useInfiniteQuery`)

> Phase 4 / 주제: 책 목록·피드 페이지네이션을 `useInfiniteQuery`로 구현하고 다음 페이지를 자동 로드한다.

---

## 1. 오늘 읽을 코드

- [ActivityFeed.tsx](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx) — `useInfiniteQuery` + Intersection Observer 실제 구현
- [activityApi.ts](../apps/page0127/src/entities/activity/api/activityApi.ts) — offset 기반 페이징 API
- [queryKeys.ts](../apps/page0127/src/entities/activity/model/queryKeys.ts) — 피드 queryKey 설계 ([[Day 46]] 복습)

---

## 2. 핵심 개념

### `useQuery` vs `useInfiniteQuery`

| 항목 | `useQuery` | `useInfiniteQuery` |
| --- | --- | --- |
| 반환 `data` | 단일 응답 | `{ pages: T[][], pageParams: [] }` |
| 페이지 누적 | ❌ | ✅ 페이지 배열로 쌓임 |
| 핵심 옵션 | — | `initialPageParam`, `getNextPageParam` |
| 다음 페이지 | — | `fetchNextPage()`, `hasNextPage` |

가장 큰 차이는 `data`가 **2차원 배열**이라는 점이다. 페이지별 응답이 `data.pages`에 순서대로 쌓이므로, 화면에 뿌릴 땐 평탄화한다.

```typescript
const items = data?.pages.flat() ?? [];
```

### 🔍 `data.pages`가 2차원으로 쌓이는 과정

비유: 뷔페에서 음식을 **접시에 나눠 담는다**고 생각하자. 한 번에 다 담지 않고, 스크롤할 때마다 새 접시를 받는다.

**① 처음 진입 (요청 1번)** — `initialPageParam: 0` → "0번부터 20개"

```
data = {
  pages: [
    [활동1, 활동2, ..., 활동20]   ← 접시 1장
  ],
  pageParams: [0]
}
```

`pages`는 **배열 안에 배열**이 들어있다. 이게 "2차원"이다.
→ 바깥 배열 = 페이지 목록 / 안쪽 배열 = 그 페이지의 실제 데이터.

**② 스크롤 → `fetchNextPage()` (요청 2번)** — "20번부터 20개"

```
data = {
  pages: [
    [활동1, ..., 활동20],    ← 접시 1 (그대로 유지)
    [활동21, ..., 활동40]    ← 접시 2 (새로 추가)
  ],
  pageParams: [0, 20]
}
```

> 기존 접시는 그대로 두고 **새 접시만 뒤에 붙는다.** 그래서 스크롤해도 위 내용이 사라지지 않는다.

**③ 화면에 뿌릴 때 → `.flat()`으로 펴기**

```typescript
data.pages.flat()
// [[1~20], [21~40]]  →  [1, 2, 3, ..., 40]
```

```
┌─ data.pages (2차원, 저장용) ─┐        ┌─ .flat() (1차원, 화면용) ─┐
│  [                          │        │  [                       │
│    [1, 2, ..., 20],   접시1 │  flat  │    1, 2, 3, ..., 40      │
│    [21, 22, ..., 40], 접시2 │ ─────► │  ]                       │
│  ]                          │        │                          │
└─────────────────────────────┘        └──────────────────────────┘
   "어느 페이지에서 왔는지" 기억           "사용자가 보는 연속된 목록"
```

> **왜 2차원으로 저장?** 페이지 단위로 따로 관리해야 캐싱·재요청·페이지별 갱신이 가능하기 때문. 화면용으로만 `.flat()`으로 합친다.

### ⚠️ 항상 2차원인 건 아니다 — 바깥은 배열, 안쪽은 API 모양 그대로

`data.pages`라는 **바깥 껍데기는 항상 배열**(페이지를 쌓는 게 본질). 하지만 **각 페이지 안의 모양은 API 응답 그대로** 들어간다.

```typescript
// 경우 ① API가 배열 반환 (page0127) → 진짜 2차원
data.pages = [[1~20], [21~40]];
const items = data.pages.flat();                   // ✅

// 경우 ② API가 객체 반환 → 2차원 아님
data.pages = [
  { items: [1~20], nextCursor: 'abc' },
  { items: [21~40], nextCursor: 'def' },
];
const items = data.pages.flatMap((p) => p.items);  // ✅ 안쪽 items를 꺼내 합침
```

| | 배열을 주는 API | 객체를 주는 API |
| --- | --- | --- |
| 합치기 | `.flat()` | `.flatMap((p) => p.items)` |
| 끝 판단 | `lastPage.length < 20` | `lastPage.items.length < 20` 또는 `!lastPage.nextCursor` |

> page0127은 `getFeed`가 `Activity[]`(배열)를 줘서 우연히 깔끔한 2차원이 된 케이스. **한 페이지의 모양은 API가 결정한다.**

### 필수 4종 세트

```typescript
useInfiniteQuery({
  queryKey,
  queryFn: ({ pageParam }) => fetchPage(pageParam), // pageParam을 받아 호출
  initialPageParam: 0,                              // 첫 pageParam (필수)
  getNextPageParam: (lastPage, allPages) => {
    // 다음 pageParam을 반환. undefined면 끝(hasNextPage=false)
    if (lastPage.length < LIMIT) return undefined;
    return allPages.flat().length;                  // 다음 offset
  },
});
```

> `getNextPageParam`이 `undefined`를 반환하는 순간 `hasNextPage`가 `false`가 된다. **종료 조건을 여기서 결정**하는 게 핵심.

---

## 3. page0127 실제 코드 사례

### offset 기반 페이징 API ([activityApi.ts](../apps/page0127/src/entities/activity/api/activityApi.ts))

```typescript
getFeed: async (params?: FeedParams): Promise<Activity[]> => {
  const { limit = 20, offset = 0 } = params || {};
  const response = await apiClient.get<Activity[]>(API_ENDPOINTS.feed.list, {
    params: { limit, offset }, // ← offset/limit 쿼리스트링
  });
  return response.data;
},
```

### useInfiniteQuery 호출부 ([ActivityFeed.tsx](../apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx))

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
  useInfiniteQuery({
    queryKey: activityKeys.feeds(),
    queryFn: ({ pageParam = 0 }) =>
      activityApi.getFeed({ limit: 20, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;   // 20개 미만 → 마지막 페이지
      return allPages.flat().length;                // 누적 개수 = 다음 offset
    },
    initialPageParam: 0,
  });
```

### 자동 로드 — Intersection Observer

스크롤이 트리거 div에 닿으면 `fetchNextPage()` 호출:

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage(); // ← 화면 끝 도달 시 다음 페이지
    }
  },
  { threshold: 0.1 }
);
observer.observe(observerRef.current);
```

> `hasNextPage && !isFetchingNextPage` 가드가 없으면 중복 호출이 폭주한다. **반드시 둘 다 체크**.

렌더링:

```tsx
const activities = data?.pages.flat() || []; // 2차원 → 1차원

{activities.map((activity) => (
  <ActivityCard key={activity.id} activity={activity} />
))}
<div ref={observerRef} />                    // 관찰 대상(센티넬)
```

---

## 4. 가장 간단한 사용법 (최소 코드)

> 위 page0127 코드에서 군더더기를 다 빼고, **핵심만 남긴 최소 예제.** 이것만 외워도 무한 스크롤은 만든다.

### Step 1. 페이지를 가져오는 함수

```typescript
// "offset번째부터 10개 줘"
const fetchBooks = async (offset: number) => {
  const res = await apiClient.get<Book[]>('/books', {
    params: { limit: 10, offset },
  });
  return res.data; // Book[] 반환
};
```

### Step 2. 컴포넌트 — 버튼으로 다음 페이지 불러오기 (가장 쉬운 형태)

```tsx
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

export const BookList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['books'],                          // ① 쿼리 키
      queryFn: ({ pageParam }) => fetchBooks(pageParam), // ② pageParam으로 호출
      initialPageParam: 0,                          // ③ 첫 offset
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < 10                        // ④ 10개 미만이면 끝
          ? undefined
          : allPages.flat().length,                 //    아니면 다음 offset
    });

  const books = data?.pages.flat() ?? [];           // ⑤ 2차원 → 1차원

  return (
    <div>
      {books.map((book) => (
        <p key={book.id}>{book.title}</p>
      ))}

      {/* "더 보기" 버튼: 다음 페이지가 있을 때만 */}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  );
};
```

**이게 전부다.** ①~⑤ 다섯 군데만 채우면 동작한다.
"스크롤하면 자동으로" 하고 싶을 때만 버튼 대신 `IntersectionObserver`(위 page0127 코드)를 붙이면 된다.

| 단계 | 하는 일 |
| --- | --- |
| ① queryKey | 캐시 식별자 |
| ② queryFn | `pageParam`(위치)을 받아 한 페이지 요청 |
| ③ initialPageParam | 첫 요청 위치 (보통 0) |
| ④ getNextPageParam | 다음 위치 계산 / `undefined`면 끝 |
| ⑤ `.flat()` | 쌓인 페이지를 화면용 1차원으로 |

---

## 5. 정리

| 신경 쓸 것 | 규칙 |
| --- | --- |
| 데이터 구조 | `data.pages`는 2차원 → `.flat()`으로 평탄화 |
| 종료 조건 | `getNextPageParam`이 `undefined` 반환 = 끝 |
| 중복 호출 방지 | `hasNextPage && !isFetchingNextPage` 가드 |
| 자동 로드 | 센티넬 div + IntersectionObserver |

**한 줄 규칙:** 무한 스크롤 = `getNextPageParam`으로 "다음 offset/끝"을 정하고, 화면 끝 센티넬이 닿으면 `fetchNextPage()`.

---

## 6. 오늘 실험 (2가지)

1. **`limit`을 5로 줄여보기**
   `getFeed({ limit: 5, ... })` + `getNextPageParam`의 `20` → `5`로 변경.
   페이지가 더 잘게 쪼개져 `data.pages` 배열이 빠르게 늘어나는 걸 React Query DevTools에서 관찰한다.

2. **버튼 방식으로 바꿔보기**
   Intersection Observer를 잠시 주석 처리하고 "더 보기" 버튼을 추가:
   ```tsx
   {hasNextPage && (
     <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
       {isFetchingNextPage ? '불러오는 중...' : '더 보기'}
     </button>
   )}
   ```
   자동 로드와 수동 로드의 UX 차이를 비교해본다.

---

## 7. 다음 Day 예고

**Day 49 — Phase 4 복습**: SC/CC 분리 + TanStack Query 설계(queryKey·mutation·무한쿼리)를 최종 점검하고, 변경 내역을 PR 설명처럼 정리한다.
