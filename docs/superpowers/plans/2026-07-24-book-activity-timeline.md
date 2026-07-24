# 책별 활동 타임라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 각 책 상세(`/{username}/{bookId}`)에 그 책의 활동(담음·완독·리뷰)을 시간순으로 모으고, 거기서 바로 댓글·좋아요까지 할 수 있게 한다.

**Architecture:** 새 테이블 없이 기존 `activities`/`activity_comments`/`activity_likes`를 재사용한다. 피드 API의 "활동+프로필+좋아요 조합" 로직을 순수 함수 `buildActivityItems`로 추출해 피드·책 API가 공유하고, `book_id`로 조회하는 `GET /api/books/[id]/activities`를 추가한다. UI는 `ActivityFeed`를 `ActivityList`로 일반화해 재사용하고, `ActivityCard`에 `hideBook`을 더해 책 상세에서 책 표지 중복을 없앤다.

**Tech Stack:** Next.js 16(App Router, Server Component 우선), Supabase, TanStack Query(useInfiniteQuery), vitest(순수 함수 단위), Playwright(e2e), FSD 구조.

## Global Constraints

- Server Component 우선. `'use client'`는 상태/이벤트/쿼리 훅이 필요할 때만.
- FSD 레이어 준수(`entities`/`features`/`widgets`/`shared`), 경로 alias `@/`.
- 새 DB 테이블/마이그레이션 없음 — 기존 테이블 재사용.
- 커밋 메시지에 `Co-Authored-By` 트레일러 절대 금지.
- 한국어 주석은 "학습 포인트"에만 간결히.
- 테스트: 순수 로직은 소스 옆 `*.test.ts`(vitest), UI/흐름은 Playwright. 실행은 `cd apps/page0127`.

---

### Task 1: `buildActivityItems` 순수 조합 함수 (TDD)

피드 route의 조합 로직을, 조회 결과를 받아 조합만 하는 순수 함수로 추출한다. 순수하므로 vitest로 완전 TDD 가능하고, 피드·책 API가 공유한다.

**Files:**
- Create: `apps/page0127/app/api/_helpers/buildActivityItems.ts`
- Test: `apps/page0127/app/api/_helpers/buildActivityItems.test.ts`

**Interfaces:**
- Produces:
  - `type RawActivity = { id: string; user_id: string; activity_type: 'book_added'|'book_completed'|'review_added'; book_id: string; content: string | null; created_at: string }`
  - `type RawProfile = { id: string; nickname: string | null; photo_url: string | null }`
  - `type RawBook = { id: string; title: string; author: string; cover_image: string | null; status: string; rating: number | null }`
  - `type RawLike = { activity_id: string; user_id: string }`
  - `buildActivityItems(input: { activities: RawActivity[]; profiles: RawProfile[]; books: RawBook[]; likes: RawLike[]; currentUserId: string | null }): Activity[]` — `Activity`는 `@/entities/activity`의 타입.

- [ ] **Step 1: 실패 테스트 작성**

`apps/page0127/app/api/_helpers/buildActivityItems.test.ts`:
```ts
import { expect, test } from 'vitest';

import { buildActivityItems } from './buildActivityItems';

const baseActivity = {
  id: 'a1',
  user_id: 'u1',
  activity_type: 'book_added' as const,
  book_id: 'b1',
  content: null,
  created_at: '2026-07-24T00:00:00Z',
};

test('활동에 프로필·책·좋아요를 조합한다', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [{ id: 'u1', nickname: '철수', photo_url: null }],
    books: [{ id: 'b1', title: '책제목', author: '저자', cover_image: null, status: 'reading', rating: null }],
    likes: [{ activity_id: 'a1', user_id: 'u2' }],
    currentUserId: 'u1',
  });

  expect(item.user.nickname).toBe('철수');
  expect(item.book?.title).toBe('책제목');
  expect(item.likes).toEqual({ count: 1, isLiked: false });
});

test('현재 사용자가 누른 좋아요는 isLiked=true', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [{ id: 'u1', nickname: '철수', photo_url: null }],
    books: [{ id: 'b1', title: '책', author: '저자', cover_image: null, status: 'reading', rating: null }],
    likes: [{ activity_id: 'a1', user_id: 'u1' }],
    currentUserId: 'u1',
  });

  expect(item.likes).toEqual({ count: 1, isLiked: true });
});

test('책 정보가 없으면 book=null', () => {
  const [item] = buildActivityItems({
    activities: [baseActivity],
    profiles: [],
    books: [],
    likes: [],
    currentUserId: null,
  });

  expect(item.book).toBeNull();
  expect(item.user.nickname).toBeNull();
  expect(item.likes).toEqual({ count: 0, isLiked: false });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/buildActivityItems.test.ts`
Expected: FAIL — `buildActivityItems` is not defined / 모듈 없음

- [ ] **Step 3: 최소 구현**

`apps/page0127/app/api/_helpers/buildActivityItems.ts`:
```ts
import type { Activity } from '@/entities/activity';

// 조회 결과 원본 타입 — Supabase에서 그대로 받은 행 모양
export type RawActivity = {
  id: string;
  user_id: string;
  activity_type: 'book_added' | 'book_completed' | 'review_added';
  book_id: string;
  content: string | null;
  created_at: string;
};
export type RawProfile = { id: string; nickname: string | null; photo_url: string | null };
export type RawBook = {
  id: string;
  title: string;
  author: string;
  cover_image: string | null;
  status: string;
  rating: number | null;
};
export type RawLike = { activity_id: string; user_id: string };

type BuildInput = {
  activities: RawActivity[];
  profiles: RawProfile[];
  books: RawBook[];
  likes: RawLike[];
  currentUserId: string | null;
};

/**
 * 조회 결과(활동/프로필/책/좋아요)를 화면용 Activity로 조합하는 순수 함수.
 * 학습 포인트: I/O(조회)와 조합 로직을 분리하면 조합만 단위테스트할 수 있다.
 */
export function buildActivityItems({
  activities,
  profiles,
  books,
  likes,
  currentUserId,
}: BuildInput): Activity[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return activities.map((a) => {
    const profile = profileMap.get(a.user_id);
    const book = bookMap.get(a.book_id);
    const activityLikes = likes.filter((l) => l.activity_id === a.id);

    return {
      id: a.id,
      activity_type: a.activity_type,
      content: a.content,
      created_at: a.created_at,
      user: {
        id: a.user_id,
        nickname: profile?.nickname ?? null,
        photo_url: profile?.photo_url ?? null,
      },
      book: book
        ? {
            id: book.id,
            title: book.title,
            author: book.author,
            cover_image: book.cover_image,
            status: book.status,
            rating: book.rating,
          }
        : null,
      likes: {
        count: activityLikes.length,
        isLiked: currentUserId ? activityLikes.some((l) => l.user_id === currentUserId) : false,
      },
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/buildActivityItems.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/app/api/_helpers/buildActivityItems.ts apps/page0127/app/api/_helpers/buildActivityItems.test.ts
git commit -m "feat(activity): 활동 조합 순수 함수 buildActivityItems 추가"
```

---

### Task 2: 피드 API를 `buildActivityItems`로 리팩터

기존 피드 route의 조합 로직을 새 함수로 교체(동작 동일, 중복 제거).

**Files:**
- Modify: `apps/page0127/app/api/feed/route.ts:58-125`

**Interfaces:**
- Consumes: `buildActivityItems`, `RawLike` (Task 1)

- [ ] **Step 1: 조합부 교체**

`feed/route.ts`에서 profiles/books/likes 조회는 유지하고, 59줄 이후 `profileMap`~`return successResponse(feed)` 구간을 아래로 교체:
```ts
    // 활동과 관련된 프로필/책/좋아요 조회 (배치)
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const bookIds = [...new Set(activities.map((a) => a.book_id))];
    const activityIds = activities.map((a) => a.id);

    const [{ data: profiles }, { data: books }, { data: likes }] = await Promise.all([
      supabase.from('profiles').select('id, nickname, photo_url').in('id', userIds),
      supabase.from('books').select('id, title, author, cover_image, status, rating').in('id', bookIds),
      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
    ]);

    const feed = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: books ?? [],
      likes: likes ?? [],
      currentUserId: user!.id,
    });

    return successResponse(feed);
```
그리고 파일 상단 import에 추가:
```ts
import { buildActivityItems } from '../_helpers/buildActivityItems';
```

- [ ] **Step 2: 타입체크**

Run: `cd apps/page0127 && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 회귀 확인(수동)**

로컬 실행 후 `/feed`에서 활동·좋아요·프로필이 이전과 동일하게 보이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/app/api/feed/route.ts
git commit -m "refactor(feed): 조합 로직을 buildActivityItems로 통일"
```

---

### Task 3: `GET /api/books/[id]/activities` 추가

그 책의 활동을 공개범위에 맞춰 조회한다. 비로그인 방문자도 공개 책은 볼 수 있다.

**Files:**
- Create: `apps/page0127/app/api/books/[id]/activities/route.ts`

**Interfaces:**
- Consumes: `buildActivityItems` (Task 1), `getSupabaseClient` (`../../../_helpers/auth`), `successResponse`/`errorResponse`/`notFoundResponse` (`../../../_helpers/response`)
- Produces: 응답 body = `Activity[]` (피드와 동일 형태)

- [ ] **Step 1: 라우트 구현**

`apps/page0127/app/api/books/[id]/activities/route.ts`:
```ts
import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../../_helpers/auth';
import { buildActivityItems } from '../../../_helpers/buildActivityItems';
import { errorResponse, notFoundResponse, successResponse } from '../../../_helpers/response';

/**
 * GET /api/books/[id]/activities?limit=20&offset=0
 * 그 책의 활동을 시간순(최신순)으로 조회한다.
 *
 * 공개범위:
 * - 공개 책: 비로그인 포함 누구나
 * - 비공개 책: 소유자만 (아니면 404)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const supabase = await getSupabaseClient();

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 로그인 여부는 선택 — 비로그인도 공개 책은 볼 수 있다
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 책 조회 + 공개범위 판정
    const { data: book } = await supabase
      .from('books')
      .select('id, user_id, is_public, title, author, cover_image, status, rating')
      .eq('id', bookId)
      .single();

    if (!book) return notFoundResponse('책');

    const isOwner = user?.id === book.user_id;
    if (!book.is_public && !isOwner) {
      return notFoundResponse('책');
    }

    // 그 책의 활동 (최신순, 페이지네이션)
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, user_id, activity_type, book_id, content, created_at')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse(error.message);
    if (!activities || activities.length === 0) return successResponse([]);

    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const activityIds = activities.map((a) => a.id);

    const [{ data: profiles }, { data: likes }] = await Promise.all([
      supabase.from('profiles').select('id, nickname, photo_url').in('id', userIds),
      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
    ]);

    const items = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: [{ id: book.id, title: book.title, author: book.author, cover_image: book.cover_image, status: book.status, rating: book.rating }],
      likes: likes ?? [],
      currentUserId: user?.id ?? null,
    });

    return successResponse(items);
  } catch (error) {
    console.error('책 활동 조회 에러:', error);
    return errorResponse('책 활동 조회에 실패했습니다.');
  }
}
```

> 참고: `notFoundResponse(resource)`는 `${resource}를 찾을 수 없습니다.`를 404로 반환하는 기존 헬퍼다(`response.ts`). `errorResponse(message, status)`도 사용 가능.

- [ ] **Step 2: 타입체크**

Run: `cd apps/page0127 && npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/app/api/books/[id]/activities/route.ts
git commit -m "feat(book): 책별 활동 조회 API 추가"
```

---

### Task 4: 엔드포인트 + 클라이언트 API + 쿼리키

**Files:**
- Modify: `apps/page0127/src/shared/config/endpoints.ts:10-18`
- Modify: `apps/page0127/src/entities/activity/api/activityApi.ts`
- Modify: `apps/page0127/src/entities/activity/model/queryKeys.ts`

**Interfaces:**
- Produces:
  - `API_ENDPOINTS.books.activities(id: string): string`
  - `activityApi.getBookActivities(bookId: string, params?: FeedParams): Promise<Activity[]>`
  - `activityKeys.bookActivities(bookId: string)`

- [ ] **Step 1: 엔드포인트 추가**

`endpoints.ts`의 `books` 객체에 한 줄 추가:
```ts
    like: '/books/like', // 책 좋아요 토글
    activities: (id: string) => `/books/${id}/activities`, // GET: 책별 활동 타임라인
```

- [ ] **Step 2: 클라이언트 API 추가**

`activityApi.ts`의 `activityApi` 객체에 추가(그리고 상단 import에 `API_ENDPOINTS` 이미 존재):
```ts
  /**
   * 특정 책의 활동 타임라인 조회
   */
  getBookActivities: async (
    bookId: string,
    params?: FeedParams
  ): Promise<Activity[]> => {
    const { limit = 20, offset = 0 } = params || {};
    const response = await apiClient.get<Activity[]>(
      API_ENDPOINTS.books.activities(bookId),
      { params: { limit, offset } }
    );
    return response.data;
  },
```

- [ ] **Step 3: 쿼리키 추가**

`queryKeys.ts`의 `activityKeys`에 추가:
```ts
  // 책별 활동 타임라인
  bookActivities: (bookId: string) =>
    [...activityKeys.all, 'book', bookId] as const,
```

- [ ] **Step 4: 타입체크 + 커밋**

Run: `cd apps/page0127 && npx tsc --noEmit` → 에러 없음
```bash
git add apps/page0127/src/shared/config/endpoints.ts apps/page0127/src/entities/activity/api/activityApi.ts apps/page0127/src/entities/activity/model/queryKeys.ts
git commit -m "feat(activity): 책별 활동 클라이언트 API·쿼리키 추가"
```

---

### Task 5: `ActivityCard`에 `hideBook` 추가

책 상세에선 같은 책 표지가 반복되므로 첨부를 숨긴다.

**Files:**
- Modify: `apps/page0127/src/widgets/activity/ui/ActivityCard.tsx:22-25,83-119`

**Interfaces:**
- Produces: `ActivityCardProps.hideBook?: boolean` (기본 false)

- [ ] **Step 1: prop 추가 + 책 첨부 조건부 렌더**

`ActivityCardProps` 타입에 추가:
```ts
type ActivityCardProps = {
  activity: Activity;
  initialCommentsOpen?: boolean;
  hideBook?: boolean; // 책 상세에선 책 표지 첨부를 숨긴다(중복 방지)
};
```
컴포넌트 시그니처:
```ts
export const ActivityCard = ({
  activity,
  initialCommentsOpen = false,
  hideBook = false,
}: ActivityCardProps) => {
```
"책 첨부" 블록(현재 83~119줄의 `<div className='mt-4 flex items-center gap-4 ...'> ... </div>`)을 `{!hideBook && ( ... )}`로 감싼다.

- [ ] **Step 2: 타입체크**

Run: `cd apps/page0127 && npx tsc --noEmit`
Expected: 에러 없음(기존 호출부는 `hideBook` 미지정 → 기본 false로 동작)

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/src/widgets/activity/ui/ActivityCard.tsx
git commit -m "feat(activity): ActivityCard에 hideBook 옵션 추가"
```

---

### Task 6: `ActivityFeed` → `ActivityList` 일반화

`queryKey`·`queryFn`·빈 상태·`hideBook`을 주입받는 `ActivityList`로 일반화하고, 기존 `ActivityFeed`는 이를 감싸는 얇은 래퍼로 둔다(피드 사용처는 그대로 동작).

**Files:**
- Create: `apps/page0127/src/widgets/activity/ui/ActivityList.tsx`
- Modify: `apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx` (래퍼로 축소)
- Modify: `apps/page0127/src/widgets/activity/index.ts` (export 추가)

**Interfaces:**
- Consumes: `ActivityCard`(+`hideBook`, Task 5), `activityApi`(Task 4)
- Produces:
  - `ActivityList` props: `{ queryKey: readonly unknown[]; queryFn: (params: { limit: number; offset: number }) => Promise<Activity[]>; emptyState?: React.ReactNode; hideBook?: boolean }`

- [ ] **Step 1: `ActivityList` 작성**

기존 `ActivityFeed.tsx`의 무한스크롤 로직을 옮기되 `queryKey`/`queryFn`/`emptyState`/`hideBook`을 props로 받는다.

`apps/page0127/src/widgets/activity/ui/ActivityList.tsx`:
```tsx
'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import type { Activity } from '@/entities/activity';

import { ActivityCard } from './ActivityCard';

type ActivityListProps = {
  queryKey: readonly unknown[];
  queryFn: (params: { limit: number; offset: number }) => Promise<Activity[]>;
  emptyState?: React.ReactNode;
  hideBook?: boolean;
};

const PAGE_SIZE = 20;

/**
 * 활동 목록(무한 스크롤) 공용 컴포넌트.
 * 학습 포인트: 데이터 소스(queryKey/queryFn)를 주입받아 피드·책 타임라인이 재사용한다.
 */
export const ActivityList = ({ queryKey, queryFn, emptyState, hideBook }: ActivityListProps) => {
  const observerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = 0 }) => queryFn({ limit: PAGE_SIZE, offset: pageParam }),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.flat().length,
      initialPageParam: 0,
    });

  const onIntersect = useEffectEvent(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const activities = data?.pages.flat() || [];

  if (activities.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div>
      <div className='divide-y divide-line-soft border-t border-line'>
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} hideBook={hideBook} />
        ))}
      </div>
      <div ref={observerRef} className='py-4'>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>
      {!hasNextPage && activities.length > 0 && (
        <p className='py-4 text-center text-sm text-muted-foreground'>
          모든 활동을 불러왔습니다
        </p>
      )}
    </div>
  );
};
```

- [ ] **Step 2: `ActivityFeed`를 래퍼로 축소**

`ActivityFeed.tsx` 전체를 아래로 교체:
```tsx
'use client';

import Link from 'next/link';

import { activityApi, activityKeys } from '@/entities/activity';

import { ActivityList } from './ActivityList';

/**
 * 팔로잉 피드 — ActivityList에 피드 데이터 소스를 주입한다.
 */
export const ActivityFeed = () => (
  <ActivityList
    queryKey={activityKeys.feeds()}
    queryFn={(params) => activityApi.getFeed(params)}
    emptyState={
      <div className='rounded-2xl bg-sunken py-14 text-center'>
        <p className='text-text-body'>팔로우한 사람이 책을 읽으면 여기에 쌓입니다.</p>
        <Link href='/search' className='mt-3 inline-block text-sm font-medium text-primary hover:underline'>
          함께 읽는 사람 찾아보기
        </Link>
      </div>
    }
  />
);
```

- [ ] **Step 3: export 추가**

`apps/page0127/src/widgets/activity/index.ts`에 `ActivityList` export가 없으면 추가:
```ts
export { ActivityList } from './ui/ActivityList';
```

- [ ] **Step 4: 타입체크 + 피드 회귀 확인**

Run: `cd apps/page0127 && npx tsc --noEmit` → 에러 없음
로컬 `/feed`가 이전과 동일하게 동작하는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/widgets/activity/ui/ActivityList.tsx apps/page0127/src/widgets/activity/ui/ActivityFeed.tsx apps/page0127/src/widgets/activity/index.ts
git commit -m "refactor(activity): 무한스크롤 목록을 ActivityList로 일반화"
```

---

### Task 7: 책 상세에 "이 책의 기록" 섹션 통합

`BookDetailContent`(Server Component, 공유) 맨 아래에 `ActivityList`(client)를 넣는다. 책 상세 페이지는 `/{username}/{bookId}` 하나뿐이라 이 한 곳이면 소유자·방문자 모두 커버된다.

**Files:**
- Modify: `apps/page0127/src/widgets/book/ui/BookDetailContent.tsx`

**Interfaces:**
- Consumes: `ActivityList`(Task 6), `activityApi.getBookActivities`·`activityKeys.bookActivities`(Task 4)

- [ ] **Step 1: 섹션용 클라이언트 래퍼 작성**

`BookDetailContent`는 Server Component라 훅을 직접 못 쓴다. 얇은 클라이언트 섹션 컴포넌트를 만든다.

Create `apps/page0127/src/widgets/book/ui/BookActivitySection.tsx`:
```tsx
'use client';

import { activityApi, activityKeys } from '@/entities/activity';

import { ActivityList } from '@/widgets/activity';

/**
 * 책 상세의 "이 책의 기록" — 그 책의 활동 타임라인.
 * 책 표지는 상단 상세에 이미 있으므로 hideBook으로 카드에선 숨긴다.
 */
export const BookActivitySection = ({ bookId }: { bookId: string }) => (
  <section className='mt-6'>
    <h2 className='heading-2 mb-3 text-text-strong'>이 책의 기록</h2>
    <ActivityList
      queryKey={activityKeys.bookActivities(bookId)}
      queryFn={(params) => activityApi.getBookActivities(bookId, params)}
      hideBook
      emptyState={
        <p className='rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이 책의 기록이 없어요.
        </p>
      }
    />
  </section>
);
```

- [ ] **Step 2: `BookDetailContent`에 섹션 추가**

`BookDetailContent.tsx` 상단 import에 추가:
```ts
import { BookActivitySection } from './BookActivitySection';
```
반환 JSX의 마지막 `</>` 직전(책 소개 `Card` 다음)에 추가:
```tsx
      <BookActivitySection bookId={book.id} />
```

- [ ] **Step 3: 빌드 확인**

Run: `cd apps/page0127 && npm run build`
Expected: 빌드 성공(Server/Client 경계 에러 없음)

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/widgets/book/ui/BookActivitySection.tsx apps/page0127/src/widgets/book/ui/BookDetailContent.tsx
git commit -m "feat(book): 책 상세에 '이 책의 기록' 타임라인 섹션 추가"
```

---

### Task 8: E2E — 책 상세 타임라인 + 댓글

**Files:**
- Create: `apps/page0127/e2e/book-activity-timeline.spec.ts`

**Interfaces:**
- Consumes: 기존 e2e 인증/헬퍼 패턴(`apps/page0127/e2e/auth-gate.spec.ts` 참고)

- [ ] **Step 1: 기존 e2e 패턴 확인**

Read: `apps/page0127/e2e/auth-gate.spec.ts` — 로그인 상태 구성/셀렉터 관행을 그대로 따른다.

- [ ] **Step 2: 스펙 작성(관찰 가능한 흐름)**

책이 있는 계정으로 `/{username}/{bookId}`에 진입 → "이 책의 기록" 섹션이 보이고 → 그 책에 대한 활동 카드가 나타나며(예: "책장에 담았어요") → 댓글 입력 후 작성 시 목록에 반영되는지 검증. (셀렉터/로그인 셋업은 `auth-gate.spec.ts` 방식에 맞춰 작성)

- [ ] **Step 3: 실행**

Run: `cd apps/page0127 && npm run test:e2e -- book-activity-timeline`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/e2e/book-activity-timeline.spec.ts
git commit -m "test(book): 책별 활동 타임라인 e2e 추가"
```

---

## 완료 기준

- `/feed`는 리팩터 후에도 동일하게 동작(회귀 없음)
- 책 상세 `/{username}/{bookId}`에 "이 책의 기록"이 시간순으로 표시
- 공개 책은 방문자(비로그인 포함)도, 비공개 책은 소유자만 타임라인 조회
- 책 상세에서 댓글·좋아요가 피드와 동일하게 동작
- `buildActivityItems` 단위테스트 그린, 전체 빌드·타입체크 통과
