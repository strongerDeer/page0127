# 책 단위 댓글 ② 피드 (중복 제거·책 카드·좋아요·새 댓글 배지) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 피드를 활동 단위에서 책 단위로 바꾼다 — 같은 책이 여러 카드로 갈라지던 것을 카드 1장으로 접고, 그 카드에 책 전체의 좋아요·댓글 수와 새 댓글 배지를 단다.

**Architecture:** `DISTINCT ON`을 쓰는 뷰(`book_latest_activities`)로 책별 최신 활동 1개만 뽑아 피드 쿼리의 모양을 유지한다. 중복을 지우면서 잃는 맥락(담음·완독 시각, 한줄평)은 화면에 뜬 `book_id` 목록으로 배치 조회 한 번을 더 해 되살린다. 조립은 기존 `buildActivityItems` 순수 함수를 확장해 담고, 라우트는 조회만 한다.

**Tech Stack:** Next.js 16 (App Router) · Supabase(Postgres + RLS) · TanStack Query · Tailwind · vitest

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-25-book-level-comments-design.md`. 계획 1(`2026-07-25-book-comments-1-core.md`)은 완료·main 병합됨(머지 커밋 `8d66732`).
- **리뷰 본문은 `books.one_line_review`를 쓴다** — 스펙의 미결 사항을 이렇게 확정했다(2026-07-27). `review_added` 활동은 생성 호출처가 없어 0건이므로 전제로 삼지 않는다. 활동 생성 코드는 이 계획에서 **추가하지 않는다**.
- 피드 정렬은 **최신 상태 변화 시각순**만 쓴다. 댓글이 달려도 순서를 올리지 않는다(스펙 49행 — 인기 책이 상단을 점유하고 스크롤 위치를 잃는다).
- 새 마이그레이션은 `supabase/migrations/` 에 `20260727######_*.sql` 로 만든다. 기존 파일은 수정하지 않는다.
- `20260725000001_lock_down_function_privileges.sql` 이 기본 권한을 좁혀뒀으므로, **새로 만드는 뷰에는 `GRANT SELECT ... TO anon, authenticated` 를 명시**한다.
- 집계 쿼리에 **`is_public` 을 직접 명시**한다. Supabase 클라이언트에 `Database` 제네릭이 없어 없는 컬럼을 tsc가 못 잡는다(기존 사고 재발 방지).
- 시각 비교에 **`localeCompare` 를 쓰지 않는다.** `app/api/_helpers/bookComments.ts` 의 `compareIsoTime` 을 쓴다(계획 1에서 정렬이 뒤집히는 버그를 겪었다).
- vitest는 **순수 함수 전용**(Supabase 미기동). DB 제약·뷰·RLS는 psql(54322)로 확인한다. e2e는 로그인 하네스가 없어 인증 흐름은 수동 확인이다.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 넣지 않는다.

## File Structure

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20260727000000_create_book_latest_activities.sql` (Create) | 책별 최신 활동 1개를 주는 뷰 + GRANT |
| `apps/page0127/app/api/_helpers/buildActivityItems.ts` (Modify) | 조립 순수 함수 — 책 단위 좋아요·댓글 수·배지·이벤트 요약·한줄평을 붙인다 |
| `apps/page0127/app/api/_helpers/buildActivityItems.test.ts` (Modify) | 위 함수의 단위 테스트 |
| `apps/page0127/app/api/feed/route.ts` (Modify) | 뷰 조회 + 배치 조회 5종 |
| `apps/page0127/app/api/books/[id]/likes/route.ts` (Create) | 책 단위 좋아요 POST·DELETE |
| `apps/page0127/app/api/books/[id]/thread-read/route.ts` (Create) | 스레드 열람 시각 upsert |
| `apps/page0127/src/entities/activity/types.ts` (Modify) | `Activity` 에 책 단위 필드 추가 |
| `apps/page0127/src/entities/like/api.ts` (Modify) | 책 좋아요 API 클라이언트 |
| `apps/page0127/src/features/like/ui/BookRecordLikeButton.tsx` (Create) | 책 단위 좋아요 버튼(피드 카드용) |
| `apps/page0127/src/features/like/ui/index.ts` (Modify) | 위 버튼 export |
| `apps/page0127/src/widgets/activity/ui/ActivityCard.tsx` (Modify) | 책 카드로 재구성 — 이벤트 요약 줄·한줄평·배지 |
| `apps/page0127/src/widgets/book/ui/BookStreamSection.tsx` (Modify) | 스레드를 열면 열람 시각 기록 |

---

## Task 1: `book_latest_activities` 뷰

**Files:**
- Create: `supabase/migrations/20260727000000_create_book_latest_activities.sql`

**Interfaces:**
- Produces: 뷰 `public.book_latest_activities` — `activities` 와 **같은 컬럼**(`id, user_id, activity_type, book_id, content, created_at`)에 책당 1행. Task 3이 `.from('activities')` 대신 이걸 조회한다.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 피드 책별 중복 제거용 뷰
--
-- 왜 뷰인가: supabase-js 쿼리 빌더로는 DISTINCT ON 을 쓸 수 없다. RPC 로 바꾸면
-- app/api/feed/route.ts 를 통째로 다시 써야 하므로, 뷰를 두어 기존 코드 모양
-- (.from(...).select(...).in(...).order(...).range(...))을 그대로 유지한다.
--
-- security_invoker = true: 밑단 activities 테이블의 RLS 가 조회자 기준으로 그대로
-- 적용된다. 뷰가 권한 우회 구멍이 되지 않는다(기본값은 뷰 소유자 권한이라 위험하다).
CREATE OR REPLACE VIEW public.book_latest_activities
WITH (security_invoker = true) AS
SELECT DISTINCT ON (book_id)
  id,
  user_id,
  activity_type,
  book_id,
  content,
  created_at
FROM public.activities
ORDER BY book_id, created_at DESC;

-- 20260725000001 에서 기본 권한을 좁혀뒀으므로 명시적으로 부여한다.
GRANT SELECT ON public.book_latest_activities TO anon, authenticated;

COMMENT ON VIEW public.book_latest_activities IS
  '책별 최신 활동 1행. 피드가 같은 책을 여러 장으로 띄우지 않게 한다.';
```

- [ ] **Step 2: 로컬에 적용**

Run: `cd /Users/dreamfulbud/Desktop/stronger/0127 && supabase migration up --local`
Expected: 새 마이그레이션이 적용됨(에러 없음)

- [ ] **Step 3: 뷰가 실제로 중복을 지우는지 psql로 확인**

Run:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "
select
  (select count(*) from activities) as 활동_전체,
  (select count(*) from book_latest_activities) as 뷰_행수,
  (select count(distinct book_id) from activities) as 책_종류;
"
```
Expected: `뷰_행수 = 책_종류` (활동_전체보다 작거나 같다)

각 행이 정말 그 책의 **최신** 활동인지도 본다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "
select v.book_id, v.activity_type, v.created_at,
       (select max(created_at) from activities a where a.book_id = v.book_id) as 그책_최신
from book_latest_activities v limit 5;
"
```
Expected: `created_at` 과 `그책_최신` 이 모든 행에서 같다

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260727000000_create_book_latest_activities.sql
git commit -m "feat(db): 피드 중복 제거용 book_latest_activities 뷰 추가"
```

---

## Task 2: 조립 순수 함수 확장

**Files:**
- Modify: `apps/page0127/app/api/_helpers/buildActivityItems.ts`
- Modify: `apps/page0127/app/api/_helpers/buildActivityItems.test.ts`

**Interfaces:**
- Consumes: 없음(순수 함수)
- Produces: 아래 타입과 함수. Task 3(라우트)과 Task 6(UI)이 이 모양에 의존한다.
  - `RawLike = { book_id: string; user_id: string }` — **`activity_id` 에서 바뀐다**
  - `RawBook` 에 `one_line_review: string | null` 추가
  - `RawComment = { book_id: string; user_id: string | null; created_at: string }`
  - `RawThreadRead = { book_id: string; last_read_at: string }`
  - `RawBookEvent = { book_id: string; activity_type: ActivityType; created_at: string }`
  - `buildActivityItems({ activities, profiles, books, likes, comments, threadReads, bookEvents, currentUserId })`
  - 결과 `Activity` 에 `commentCount`, `newCommentCount`, `bookEvents`, `reviewContent` 추가, `likes` 는 책 단위 집계

**왜 순수 함수에 몰아넣는가:** 라우트는 Supabase가 필요해 vitest로 못 돌린다. 배지 계산("내가 쓴 건 빼고, 마지막으로 읽은 뒤에 달린 것만")처럼 **틀리기 쉬운 규칙**을 여기 담아야 테스트로 고정된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/page0127/app/api/_helpers/buildActivityItems.test.ts` 를 아래로 **교체**한다(기존 테스트의 `likes` 모양이 바뀌므로 통째로 다시 쓴다).

```ts
import { describe, expect, it } from 'vitest';

import { buildActivityItems } from './buildActivityItems';

const activities = [
  {
    id: 'a1',
    user_id: 'u1',
    activity_type: 'book_completed' as const,
    book_id: 'b1',
    content: null,
    created_at: '2026-07-20T00:00:00+00:00',
  },
];

const profiles = [
  { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
];

const books = [
  {
    id: 'b1',
    title: '변신',
    author: '카프카',
    cover_image: null,
    status: 'completed',
    rating: 5,
    one_line_review: '읽고 나면 아침이 달라진다',
  },
];

describe('buildActivityItems', () => {
  it('좋아요를 활동이 아니라 책 단위로 센다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [
        { book_id: 'b1', user_id: 'u1' },
        { book_id: 'b1', user_id: 'u2' },
        { book_id: 'b9', user_id: 'u3' }, // 다른 책 — 세면 안 된다
      ],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u2',
    });

    expect(item.likes).toEqual({ count: 2, isLiked: true });
  });

  it('댓글 수는 그 책의 전체 댓글이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        { book_id: 'b1', user_id: 'u2', created_at: '2026-07-21T00:00:00+00:00' },
        { book_id: 'b1', user_id: 'u3', created_at: '2026-07-22T00:00:00+00:00' },
        { book_id: 'b9', user_id: 'u3', created_at: '2026-07-22T00:00:00+00:00' },
      ],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.commentCount).toBe(2);
  });

  it('새 댓글은 마지막 열람 이후 + 내가 쓴 것을 뺀 수다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        // 읽기 전 — 새 댓글 아님
        { book_id: 'b1', user_id: 'u2', created_at: '2026-07-21T00:00:00+00:00' },
        // 읽은 뒤 남이 쓴 것 — 새 댓글
        { book_id: 'b1', user_id: 'u2', created_at: '2026-07-24T00:00:00+00:00' },
        // 읽은 뒤 내가 쓴 것 — 내 글은 세지 않는다
        { book_id: 'b1', user_id: 'u1', created_at: '2026-07-25T00:00:00+00:00' },
      ],
      threadReads: [{ book_id: 'b1', last_read_at: '2026-07-23T00:00:00+00:00' }],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('한 번도 열지 않은 스레드는 남이 쓴 댓글 전부가 새 댓글이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        { book_id: 'b1', user_id: 'u2', created_at: '2026-07-21T00:00:00+00:00' },
        { book_id: 'b1', user_id: 'u1', created_at: '2026-07-22T00:00:00+00:00' },
      ],
      threadReads: [], // 열람 기록 없음
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('마이크로초 유무가 갈려도 열람 시각 비교가 뒤집히지 않는다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [
        // 열람(05:00:00)보다 나중이다 — localeCompare 로 비교하면 이전으로 판정된다
        { book_id: 'b1', user_id: 'u2', created_at: '2026-07-23T05:00:00.123456+00:00' },
      ],
      threadReads: [{ book_id: 'b1', last_read_at: '2026-07-23T05:00:00+00:00' }],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.newCommentCount).toBe(1);
  });

  it('책 이벤트는 시간순으로 싣고 한줄평을 리뷰 본문으로 준다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [
        { book_id: 'b1', activity_type: 'book_completed', created_at: '2026-07-20T00:00:00+00:00' },
        { book_id: 'b1', activity_type: 'book_added', created_at: '2026-07-01T00:00:00+00:00' },
        { book_id: 'b9', activity_type: 'book_added', created_at: '2026-07-02T00:00:00+00:00' },
      ],
      currentUserId: 'u1',
    });

    expect(item.bookEvents).toEqual([
      { activityType: 'book_added', createdAt: '2026-07-01T00:00:00+00:00' },
      { activityType: 'book_completed', createdAt: '2026-07-20T00:00:00+00:00' },
    ]);
    expect(item.reviewContent).toBe('읽고 나면 아침이 달라진다');
  });

  it('책 정보가 없으면 book은 null이고 집계는 0이다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles,
      books: [], // 조회에서 빠진 경우(비공개 등)
      likes: [{ book_id: 'b1', user_id: 'u2' }],
      comments: [{ book_id: 'b1', user_id: 'u2', created_at: '2026-07-21T00:00:00+00:00' }],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.book).toBeNull();
    expect(item.reviewContent).toBeNull();
  });

  it('닉네임이 없으면 username으로 대체한다', () => {
    const [item] = buildActivityItems({
      activities,
      profiles: [{ id: 'u1', nickname: null, username: 'kyungmin', photo_url: null }],
      books,
      likes: [],
      comments: [],
      threadReads: [],
      bookEvents: [],
      currentUserId: 'u1',
    });

    expect(item.user.nickname).toBe('kyungmin');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/buildActivityItems.test.ts`
Expected: FAIL — `likes` 인자 타입 불일치, `comments`/`threadReads`/`bookEvents` 는 아직 없는 속성

- [ ] **Step 3: 구현**

`apps/page0127/app/api/_helpers/buildActivityItems.ts` 를 아래로 교체한다.

```ts
import { compareIsoTime } from './bookComments';

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
export type RawProfile = {
  id: string;
  nickname: string | null;
  username?: string | null;
  photo_url: string | null;
};
export type RawBook = {
  id: string;
  title: string;
  author: string;
  cover_image: string | null;
  status: string;
  rating: number | null;
  one_line_review: string | null;
};
/** 책 단위 좋아요 — activity_id 가 아니라 book_id 로 센다 */
export type RawLike = { book_id: string; user_id: string };
/** 배지·개수 계산에 필요한 최소 컬럼만 받는다(본문은 피드에 필요 없다) */
export type RawComment = {
  book_id: string;
  user_id: string | null;
  created_at: string;
};
export type RawThreadRead = { book_id: string; last_read_at: string };
export type RawBookEvent = {
  book_id: string;
  activity_type: RawActivity['activity_type'];
  created_at: string;
};

type BuildInput = {
  activities: RawActivity[];
  profiles: RawProfile[];
  books: RawBook[];
  likes: RawLike[];
  comments: RawComment[];
  threadReads: RawThreadRead[];
  bookEvents: RawBookEvent[];
  currentUserId: string | null;
};

/** book_id 로 묶는다 — 배치 조회 결과를 책마다 훑지 않기 위한 준비 */
const groupByBook = <T extends { book_id: string }>(rows: T[]) => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.book_id);
    if (list) list.push(row);
    else map.set(row.book_id, [row]);
  }
  return map;
};

/**
 * 조회 결과(활동/프로필/책/좋아요/댓글/열람/이벤트)를 화면용 Activity로 조합하는 순수 함수.
 *
 * 학습 포인트:
 * - I/O(조회)와 조합 로직을 분리하면 조합만 단위테스트할 수 있다. 라우트는 Supabase가
 *   있어야 돌지만 이 함수는 없어도 돈다.
 * - 좋아요·댓글은 이제 **활동이 아니라 책**에 달린다. 한 책이 카드 1장이므로 숫자 기준도
 *   책으로 통일해야 "댓글 12(책 전체) / ♡ 2(최신 활동)" 같은 어긋남이 안 생긴다.
 */
export function buildActivityItems({
  activities,
  profiles,
  books,
  likes,
  comments,
  threadReads,
  bookEvents,
  currentUserId,
}: BuildInput): Activity[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const likesByBook = groupByBook(likes);
  const commentsByBook = groupByBook(comments);
  const eventsByBook = groupByBook(bookEvents);
  const lastReadByBook = new Map(
    threadReads.map((r) => [r.book_id, r.last_read_at])
  );

  return activities.map((a) => {
    const profile = profileMap.get(a.user_id);
    const book = bookMap.get(a.book_id);
    const bookLikes = likesByBook.get(a.book_id) ?? [];
    const bookComments = commentsByBook.get(a.book_id) ?? [];
    const lastReadAt = lastReadByBook.get(a.book_id);

    // 새 댓글: 마지막으로 읽은 뒤에 달렸고, 내가 쓴 것이 아닌 것.
    // 열람 기록이 없으면(한 번도 안 열었으면) 남이 쓴 댓글 전부가 새 댓글이다.
    // 시각 비교에 localeCompare 를 쓰면 안 된다 — 마이크로초 유무가 갈릴 때 뒤집힌다.
    const newCommentCount = bookComments.filter(
      (c) =>
        c.user_id !== currentUserId &&
        (!lastReadAt || compareIsoTime(c.created_at, lastReadAt) > 0)
    ).length;

    return {
      id: a.id,
      activity_type: a.activity_type,
      content: a.content,
      created_at: a.created_at,
      user: {
        id: a.user_id,
        // nickname 미설정 시 username으로 대체(username은 가입 시 항상 생성됨) → '익명' 대신 이름 노출
        nickname: profile?.nickname ?? profile?.username ?? null,
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
        count: bookLikes.length,
        isLiked: currentUserId
          ? bookLikes.some((l) => l.user_id === currentUserId)
          : false,
      },
      commentCount: bookComments.length,
      newCommentCount,
      // 중복 제거로 잃은 맥락을 되살린다 — "담음 7/01 · 완독 7/20"
      bookEvents: (eventsByBook.get(a.book_id) ?? [])
        .map((e) => ({
          activityType: e.activity_type,
          createdAt: e.created_at,
        }))
        .sort((x, y) => compareIsoTime(x.createdAt, y.createdAt)),
      // 리뷰 본문은 한줄평을 쓴다(review_added 활동은 생성 호출처가 없어 0건이다)
      reviewContent: book?.one_line_review ?? null,
    };
  });
}
```

- [ ] **Step 4: `Activity` 타입에 새 필드 추가**

`apps/page0127/src/entities/activity/types.ts` 의 `Activity` 에 아래를 더한다(기존 필드는 그대로).

```ts
  likes: {
    count: number;
    isLiked: boolean;
  };
  /** 이 책 스레드의 전체 댓글 수(대댓글 포함) */
  commentCount: number;
  /** 마지막 열람 이후 남이 단 댓글 수 — 0이면 배지를 감춘다 */
  newCommentCount: number;
  /** 중복 제거로 접힌 상태 변화들 — "담음 7/01 · 완독 7/20" */
  bookEvents: {
    activityType: ActivityType;
    createdAt: string;
  }[];
  /** 책 한줄평 */
  reviewContent: string | null;
};
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/buildActivityItems.test.ts`
Expected: PASS (8개)

- [ ] **Step 6: 타입 검사**

Run: `cd apps/page0127 && npm run type-check`
Expected: FAIL — `app/api/feed/route.ts` 와 `app/api/books/[id]/activities/route.ts` 가 아직 옛 인자로 호출한다. Task 3에서 고친다.

- [ ] **Step 7: 커밋**

```bash
git add apps/page0127/app/api/_helpers/buildActivityItems.ts apps/page0127/app/api/_helpers/buildActivityItems.test.ts apps/page0127/src/entities/activity/types.ts
git commit -m "feat(api): 피드 조립 함수를 책 단위 집계로 확장

좋아요를 book_id 로 세고, 댓글 수·새 댓글 배지·이벤트 요약·한줄평을 붙인다.
호출부(feed·books/[id]/activities)는 Task 3에서 맞춘다."
```

---

## Task 3: 피드 라우트를 뷰 + 배치 조회로 전환

**Files:**
- Modify: `apps/page0127/app/api/feed/route.ts`
- Modify: `apps/page0127/app/api/books/[id]/activities/route.ts`

**Interfaces:**
- Consumes: 뷰 `book_latest_activities`(Task 1), `buildActivityItems`(Task 2)
- Produces: `GET /api/feed` 응답이 `Activity[]` — 책당 1장, 새 필드 포함

- [ ] **Step 1: 피드 라우트 교체**

`apps/page0127/app/api/feed/route.ts` 의 활동 조회부터 응답까지를 아래로 바꾼다.

```ts
    // 팔로잉한 사용자들 + 본인의 활동 — 책마다 최신 1건만(뷰가 DISTINCT ON 처리)
    const { data: activities, error } = await supabase
      .from('book_latest_activities')
      .select(
        `
        id,
        user_id,
        activity_type,
        book_id,
        content,
        created_at
      `
      )
      .in('user_id', userIdsToShow)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return errorResponse(error.message);

    if (!activities || activities.length === 0) {
      return successResponse([]);
    }

    // 화면에 뜬 책들에 대해서만 배치 조회한다.
    // 중복 제거로 최신 활동 1건만 남았으므로, 접힌 맥락(이벤트 요약)은 따로 받아온다.
    const userIds = [...new Set(activities.map((a) => a.user_id))];
    const bookIds = [...new Set(activities.map((a) => a.book_id))];

    const [
      { data: profiles },
      { data: books },
      { data: likes },
      { data: comments },
      { data: threadReads },
      { data: bookEvents },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nickname, username, photo_url')
        .in('id', userIds),
      supabase
        .from('books')
        .select('id, title, author, cover_image, status, rating, one_line_review')
        .in('id', bookIds),
      supabase
        .from('book_record_likes')
        .select('book_id, user_id')
        .in('book_id', bookIds),
      // 본문은 필요 없다 — 개수와 배지 계산에 쓰는 세 컬럼만 받는다
      supabase
        .from('book_comments')
        .select('book_id, user_id, created_at')
        .in('book_id', bookIds),
      // 열람 시각은 내 것만 본다(RLS 도 본인 행만 허용한다)
      supabase
        .from('book_thread_reads')
        .select('book_id, last_read_at')
        .eq('user_id', user!.id)
        .in('book_id', bookIds),
      supabase
        .from('activities')
        .select('book_id, activity_type, created_at')
        .in('book_id', bookIds),
    ]);

    const feed = buildActivityItems({
      activities,
      profiles: profiles ?? [],
      books: books ?? [],
      likes: likes ?? [],
      comments: comments ?? [],
      threadReads: threadReads ?? [],
      bookEvents: bookEvents ?? [],
      currentUserId: user!.id,
    });

    return successResponse(feed);
```

- [ ] **Step 2: 책별 활동 라우트도 새 인자에 맞춘다**

`apps/page0127/app/api/books/[id]/activities/route.ts` 는 **뷰를 쓰지 않는다**(책 상세는 그 책의 활동을 전부 보여야 한다). 이 화면은 계획 1에서 스트림으로 대체됐지만 라우트는 남아 있으므로, 타입만 맞춰 살려둔다.

이 라우트는 `books` 를 배열 리터럴로 만들어 넘긴다. `RawBook` 에 `one_line_review` 가 추가됐으므로 **그 필드를 채워야 타입이 맞는다.** 좋아요 조회도 `book_record_likes` 로 바꾼다(`activity_likes` 는 이제 `RawLike` 모양과 다르다).

```diff
     const userIds = [...new Set(activities.map((a) => a.user_id))];
-    const activityIds = activities.map((a) => a.id);

     const [{ data: profiles }, { data: likes }] = await Promise.all([
       supabase.from('profiles').select('id, nickname, username, photo_url').in('id', userIds),
-      supabase.from('activity_likes').select('activity_id, user_id').in('activity_id', activityIds),
+      supabase.from('book_record_likes').select('book_id, user_id').eq('book_id', book.id),
     ]);

     const items = buildActivityItems({
       activities,
       profiles: profiles ?? [],
-      books: [{ id: book.id, title: book.title, author: book.author, cover_image: book.cover_image, status: book.status, rating: book.rating }],
+      books: [
+        {
+          id: book.id,
+          title: book.title,
+          author: book.author,
+          cover_image: book.cover_image,
+          status: book.status,
+          rating: book.rating,
+          one_line_review: book.one_line_review ?? null,
+        },
+      ],
       likes: likes ?? [],
+      comments: [],
+      threadReads: [],
+      bookEvents: [],
       currentUserId: user?.id ?? null,
     });
```

이 라우트가 조회하는 `book` 의 `select` 에 `one_line_review` 가 없으면 더한다. 파일 위쪽의 책 조회를 확인하고, 빠져 있으면 컬럼 목록에 `one_line_review` 를 추가한다.

- [ ] **Step 3: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 4: 로컬에서 응답 확인**

dev 서버를 띄운 상태에서(레포 루트 `npm run dev:local`), 로그인한 브라우저로 `/feed` 를 열고 DevTools Network 에서 `/api/feed` 응답을 본다.
Expected:
- 같은 책이 여러 장으로 뜨지 않는다
- 응답 각 항목에 `commentCount`, `newCommentCount`, `bookEvents`, `reviewContent` 가 있다
- `likes.count` 가 그 책의 좋아요 수다

DB와 대조한다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "
select book_id, count(*) as 좋아요 from book_record_likes group by book_id;
"
```

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/app/api/feed/route.ts apps/page0127/app/api/books/[id]/activities/route.ts
git commit -m "feat(api): 피드를 책 단위로 전환 (뷰 + 배치 조회)"
```

---

## Task 4: 책 단위 좋아요 API + 클라이언트

**Files:**
- Create: `apps/page0127/app/api/books/[id]/likes/route.ts`
- Modify: `apps/page0127/src/shared/config/endpoints.ts`
- Modify: `apps/page0127/src/entities/like/api.ts`

**Interfaces:**
- Consumes: `book_record_likes` 테이블(계획 1의 `20260725000003`)
- Produces:
  - `POST /api/books/[id]/likes` → 201 `{ message }` / 중복은 409
  - `DELETE /api/books/[id]/likes` → 200 `{ message }`
  - `API_ENDPOINTS.books.likes(bookId)`
  - `bookLikeApi.addLike(bookId)` / `bookLikeApi.removeLike(bookId)` — Task 6의 버튼이 쓴다

**경로 주의:** 기존 `/api/books/like`(전역 책 좋아요, 정적 세그먼트)와 신규 `/api/books/[id]/likes`(개인 서재 책, 동적)가 나란히 선다. Next.js는 정적을 동적보다 우선하므로 충돌하지 않는다. 읽는 사람이 헷갈리지 않도록 신규는 복수형 `likes` 로 `/api/activities/[id]/likes` 와 맞춘다.

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/books/[id]/likes/route.ts
import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/books/[id]/likes
 * 개인 서재 책에 좋아요 추가
 *
 * 학습 포인트:
 * - 좋아요 대상이 활동에서 책으로 옮겨졌다. 한 책이 카드 1장이므로 숫자 기준도 책이다.
 * - PK(user_id, book_id)가 중복을 막는다 → 23505 를 409로 돌려준다.
 * - 권한 판단을 앱에서 하지 않는다. RLS가 "볼 수 있는 책"만 허용하므로,
 *   비공개인 남의 책에 좋아요를 시도하면 정책 위반으로 걸린다.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return errorResponse('로그인이 필요합니다.', 401);

    const { error } = await supabase
      .from('book_record_likes')
      .insert({ book_id: id, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        return errorResponse('이미 좋아요를 누르셨습니다.', 409);
      }
      if (error.code === '42501' || error.message.includes('row-level security')) {
        return errorResponse('권한이 없습니다.', 403);
      }
      return errorResponse(error.message);
    }

    // 책 주인에게 알림 — 내 책이면 보내지 않는다
    const { data: book } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', id)
      .single();

    if (book && book.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: book.user_id,
        type: 'like',
        actor_id: user.id,
        target_id: id,
        target_type: 'book', // 계획 1에서 알림 라우팅에 추가한 값
      });
    }

    return successResponse({ message: '좋아요를 추가했습니다.' }, 201);
  } catch (error) {
    console.error('책 좋아요 추가 예외:', error);
    return errorResponse('좋아요 추가에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/[id]/likes
 * 좋아요 취소 — 없는 좋아요를 지워도 성공으로 둔다(멱등)
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return errorResponse('로그인이 필요합니다.', 401);

    const { error } = await supabase
      .from('book_record_likes')
      .delete()
      .eq('book_id', id)
      .eq('user_id', user.id);

    if (error) return errorResponse(error.message);

    return successResponse({ message: '좋아요를 취소했습니다.' });
  } catch (error) {
    console.error('책 좋아요 취소 예외:', error);
    return errorResponse('좋아요 취소에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 엔드포인트 추가**

`apps/page0127/src/shared/config/endpoints.ts` 의 `books` 블록에 한 줄 더한다.

```ts
    likes: (bookId: string) => `/books/${bookId}/likes`, // POST/DELETE: 개인 책 좋아요
```

- [ ] **Step 3: API 클라이언트 추가**

`apps/page0127/src/entities/like/api.ts` 끝에 더한다(기존 `likeApi` 는 그대로 둔다 — 활동 좋아요는 보존한다).

```ts
/**
 * 책 단위 좋아요 API 클라이언트
 *
 * 학습 포인트: 대상만 다르고 모양은 활동 좋아요와 같다. 409(중복)를 무시하는 것도 같은 이유다 —
 * 이미 눌린 상태이므로 사용자 입장에선 성공과 구분할 필요가 없다.
 */
export const bookLikeApi = {
  addLike: async (bookId: string): Promise<void> => {
    try {
      await apiClient.post(API_ENDPOINTS.books.likes(bookId));
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) return;
      throw error;
    }
  },

  removeLike: async (bookId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.books.likes(bookId));
  },
};
```

- [ ] **Step 4: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 5: 로컬에서 호출 확인**

dev 서버를 띄운 뒤 브라우저 콘솔(로그인 상태)에서:
```js
await fetch('/api/books/<본인_책_id>/likes', { method: 'POST' }).then(r => r.status) // 201
await fetch('/api/books/<본인_책_id>/likes', { method: 'POST' }).then(r => r.status) // 409
await fetch('/api/books/<본인_책_id>/likes', { method: 'DELETE' }).then(r => r.status) // 200
```
DB로 확인:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "select * from book_record_likes;"
```

- [ ] **Step 6: 커밋**

```bash
git add "apps/page0127/app/api/books/[id]/likes" apps/page0127/src/shared/config/endpoints.ts apps/page0127/src/entities/like/api.ts
git commit -m "feat(api): 책 단위 좋아요 API 추가"
```

---

## Task 5: 스레드 열람 시각 API

**Files:**
- Create: `apps/page0127/app/api/books/[id]/thread-read/route.ts`
- Modify: `apps/page0127/src/shared/config/endpoints.ts`

**Interfaces:**
- Consumes: `book_thread_reads` 테이블(계획 1의 `20260725000003`)
- Produces: `POST /api/books/[id]/thread-read` → 200. `API_ENDPOINTS.books.threadRead(bookId)`. Task 7이 호출한다.

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/books/[id]/thread-read/route.ts
import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '@/app/api/_helpers/auth';
import { errorResponse, successResponse } from '@/app/api/_helpers/response';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/books/[id]/thread-read
 * 이 책 스레드를 지금 읽었다고 기록한다 (새 댓글 배지의 기준선)
 *
 * 학습 포인트:
 * - upsert: 행이 없으면 넣고 있으면 갱신한다. PK(user_id, book_id)가 충돌 기준이다.
 * - 미로그인은 조용히 200으로 넘긴다. 배지는 로그인 사용자에게만 의미가 있고,
 *   읽기만 하러 온 사람에게 401 을 띄울 이유가 없다.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user } = await getCurrentUser();

    if (!user) return successResponse({ message: '기록하지 않았습니다.' });

    const { error } = await supabase.from('book_thread_reads').upsert(
      {
        book_id: id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,book_id' }
    );

    if (error) return errorResponse(error.message);

    return successResponse({ message: '열람 시각을 기록했습니다.' });
  } catch (error) {
    console.error('스레드 열람 기록 예외:', error);
    return errorResponse('열람 기록에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 엔드포인트 추가**

`apps/page0127/src/shared/config/endpoints.ts` 의 `books` 블록에 더한다.

```ts
    threadRead: (bookId: string) => `/books/${bookId}/thread-read`, // POST: 열람 시각 기록
```

- [ ] **Step 3: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/api/books/[id]/thread-read" apps/page0127/src/shared/config/endpoints.ts
git commit -m "feat(api): 스레드 열람 시각 기록 API 추가"
```

---

## Task 6: 피드 카드를 책 카드로 재구성

**Files:**
- Create: `apps/page0127/src/features/like/ui/BookRecordLikeButton.tsx`
- Modify: `apps/page0127/src/features/like/index.ts`
- Modify: `apps/page0127/src/widgets/activity/ui/ActivityCard.tsx`

**Interfaces:**
- Consumes: `bookLikeApi`(Task 4), `Activity` 의 새 필드(Task 2)
- Produces: `<BookRecordLikeButton bookId count isLiked />`

**설계 노트:** `LikeButton`(활동 좋아요)은 **지우지 않는다**. 활동 상세 화면이 아직 쓰고 있고, 원본 테이블도 보존이 원칙이다. 피드 카드만 책 좋아요로 바꾼다.

- [ ] **Step 1: 책 좋아요 버튼**

```tsx
// apps/page0127/src/features/like/ui/BookRecordLikeButton.tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { Button } from '@/shared/ui/button';

import { activityKeys } from '@/entities/activity';
import { bookLikeApi } from '@/entities/like';

import type { Activity } from '@/entities/activity';
import type { InfiniteData } from '@tanstack/react-query';

type BookRecordLikeButtonProps = {
  bookId: string;
  count: number;
  isLiked: boolean;
};

// 낙관적 업데이트 실패 시 되돌릴 이전 캐시 스냅샷
type LikeContext = { previousFeeds?: InfiniteData<Activity[]> };

/**
 * 책 단위 좋아요 버튼
 *
 * 학습 포인트:
 * - controlled 컴포넌트: count/isLiked 를 props 로만 받아 React Query 캐시가 단일 출처다.
 * - 피드는 useInfiniteQuery 라 캐시가 페이지 배열이다. 낙관적 업데이트는 그 안에서
 *   **같은 책의 카드 전부**를 뒤집어야 한다 — 한 책이 여러 페이지에 걸쳐 있을 수 있다.
 */
export const BookRecordLikeButton = ({
  bookId,
  count,
  isLiked,
}: BookRecordLikeButtonProps) => {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) await bookLikeApi.removeLike(bookId);
      else await bookLikeApi.addLike(bookId);
    },
    onMutate: async (currentlyLiked: boolean): Promise<LikeContext> => {
      // 진행 중이던 refetch 응답이 낙관적 값을 덮어쓰지 않게 취소한다
      await queryClient.cancelQueries({ queryKey: activityKeys.feeds() });

      const previousFeeds = queryClient.getQueryData<InfiniteData<Activity[]>>(
        activityKeys.feeds()
      );

      queryClient.setQueriesData<InfiniteData<Activity[]>>(
        { queryKey: activityKeys.feeds() },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) =>
              page.map((item) =>
                item.book?.id === bookId
                  ? {
                      ...item,
                      likes: {
                        count: item.likes.count + (currentlyLiked ? -1 : 1),
                        isLiked: !currentlyLiked,
                      },
                    }
                  : item
              )
            ),
          }
      );

      return { previousFeeds };
    },
    onError: (error, _vars, context) => {
      if (context?.previousFeeds) {
        queryClient.setQueryData(activityKeys.feeds(), context.previousFeeds);
      }
      toast.error(getApiErrorMessage(error, '좋아요에 실패했습니다.'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.feeds() });
    },
  });

  return (
    <Button
      variant='ghost'
      size='sm'
      className='gap-2'
      onClick={() => likeMutation.mutate(isLiked)}
      disabled={likeMutation.isPending}
      aria-pressed={isLiked}
      aria-label={isLiked ? '좋아요 취소' : '좋아요'}
    >
      <Heart
        className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
      />
      <span className='text-sm text-muted-foreground'>{count}</span>
    </Button>
  );
};
```

배럴은 **`src/features/like/ui/index.ts`** 다(`features/like/index.ts` 는 `export * from './ui'` 한 줄이라 건드리지 않는다). 거기에 한 줄 더한다.

```ts
export * from './BookRecordLikeButton';
```

- [ ] **Step 2: 카드에 이벤트 요약 줄·한줄평·배지 넣기**

`ActivityCard.tsx` 상단에 요약 포맷터를 더한다.

```tsx
const EVENT_LABEL: Record<Activity['activity_type'], string> = {
  book_added: '담음',
  book_completed: '완독',
  review_added: '리뷰',
};

/** "담음 7/01 · 완독 7/20" — 중복 제거로 접힌 활동들을 한 줄로 되살린다 */
const formatBookEvents = (events: Activity['bookEvents']) =>
  events
    .map((e) => {
      const d = new Date(e.createdAt);
      return `${EVENT_LABEL[e.activityType]} ${d.getMonth() + 1}/${d.getDate()}`;
    })
    .join(' · ');
```

그리고 책 첨부 모듈 아래, 액션 바 위에 아래를 넣는다.

```tsx
      {/* 접힌 상태 변화 요약 — 이 카드는 책 1장이므로 개별 활동은 여기로 압축된다 */}
      {activity.bookEvents.length > 1 && (
        <p className='mt-3 text-sm text-text-faint'>
          {formatBookEvents(activity.bookEvents)}
        </p>
      )}

      {/* 한줄평 — 최신 활동이 완독이어도 리뷰 본문이 보이게 한다 */}
      {activity.reviewContent && (
        <p className='mt-2 text-[15px] leading-7 text-text-body'>
          {activity.reviewContent}
        </p>
      )}
```

- [ ] **Step 3: 액션 바를 책 단위로 교체**

```diff
-        <LikeButton
-          activityId={activity.id}
-          count={activity.likes.count}
-          isLiked={activity.likes.isLiked}
-        />
+        <BookRecordLikeButton
+          bookId={activity.book.id}
+          count={activity.likes.count}
+          isLiked={activity.likes.isLiked}
+        />
         <CommentSection
           target={{ type: 'book', id: activity.book.id }}
           initialOpen={initialCommentsOpen}
         />
+        {activity.newCommentCount > 0 && (
+          <span className='rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'>
+            새 댓글 {activity.newCommentCount}
+          </span>
+        )}
```

import 도 바꾼다.

```diff
-import { LikeButton } from '@/features/like';
+import { BookRecordLikeButton } from '@/features/like';
```

- [ ] **Step 4: 타입 검사·린트·테스트**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: 눈으로 확인 (이 Task의 실질적 검수)**

로그인 상태로 `/feed` 를 열고:
1. 같은 책이 카드 1장으로만 뜬다
2. 활동이 2개 이상인 책에 `담음 7/01 · 완독 7/20` 요약 줄이 보인다
3. 한줄평이 있는 책은 본문이 보인다
4. 하트를 누르면 **즉시** 숫자가 바뀌고, 새로고침해도 유지된다
5. 다른 계정으로 그 책에 댓글을 달면, 원래 계정 피드에 `새 댓글 1` 배지가 뜬다

- [ ] **Step 6: 커밋**

```bash
git add apps/page0127/src/features/like apps/page0127/src/widgets/activity/ui/ActivityCard.tsx
git commit -m "feat(feed): 피드 카드를 책 단위로 재구성

이벤트 요약 줄·한줄평·새 댓글 배지를 붙이고 좋아요를 책 단위로 바꾼다."
```

---

## Task 7: 스레드를 열면 열람 시각 기록

**Files:**
- Modify: `apps/page0127/src/widgets/book/ui/BookStreamSection.tsx`

**Interfaces:**
- Consumes: `POST /api/books/[id]/thread-read`(Task 5)

**설계 노트:** 배지는 "마지막으로 읽은 뒤 달린 남의 댓글"이다. 그 기준선을 갱신하는 곳이 없으면 배지가 영원히 남는다. 책 상세 스트림을 **성공적으로 불러온 뒤** 한 번 기록한다(로딩 중이나 실패 시에는 기록하지 않는다 — 못 본 것을 봤다고 표시하면 안 된다).

- [ ] **Step 1: 스트림 로드 후 기록**

`BookStreamSection.tsx` 에 아래를 더한다.

```tsx
import { useEffect } from 'react';
```

`useQuery` 관련 코드 아래, `return` 위에 넣는다.

```tsx
  // 스트림을 실제로 받아온 뒤에만 "읽었다"고 기록한다.
  // bookId 가 바뀔 때마다 한 번씩 — 같은 책을 보는 동안 반복 호출하지 않는다.
  const loaded = !isLoading && data !== undefined;
  useEffect(() => {
    if (!currentUser || !loaded) return;
    apiClient
      .post(API_ENDPOINTS.books.threadRead(bookId))
      .catch(() => {
        // 배지 갱신 실패는 읽기를 막을 이유가 아니다 — 조용히 넘긴다
      });
  }, [bookId, currentUser, loaded]);
```

- [ ] **Step 2: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: 배지가 실제로 사라지는지 확인**

1. 다른 계정으로 어떤 책에 댓글을 단다
2. 원래 계정 피드에서 `새 댓글 1` 배지를 확인한다
3. 그 책 상세를 연다
4. 피드로 돌아와 새로고침 → **배지가 사라져야 한다**

DB로도 확인한다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "select * from book_thread_reads;"
```
Expected: 방금 연 책의 행이 있고 `last_read_at` 이 방금이다

- [ ] **Step 4: 전체 검증**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test && npm run test:e2e`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/widgets/book/ui/BookStreamSection.tsx
git commit -m "feat(book): 스레드를 열면 열람 시각을 기록해 새 댓글 배지를 지운다"
```

---

## 계획 2 완료 상태

- 피드에 같은 책이 여러 장으로 뜨지 않는다. 접힌 활동은 카드의 요약 줄로 남는다
- 카드의 좋아요·댓글 수가 **모두 책 기준**이라 숫자가 어긋나지 않는다
- 마지막으로 본 뒤 남이 단 댓글이 배지로 뜨고, 스레드를 열면 사라진다
- 전역 책 스레드는 여전히 라우트가 없다 — 계획 3 소관

## 다음 계획에서 다룰 것

- **계획 3**: 전역 책 스레드 라우트·UI, 전역 책 알림 라우팅, `activity_comments`/`activity_likes` 읽기 경로 제거

## 배포 전 확인 (운영)

- 계획 1의 `20260725000003`·`20260725000004` 가 **운영에 아직 적용되지 않았다.** 이 계획의 `20260727000000` 뷰보다 먼저 적용해야 한다(뷰는 `activities` 만 참조하므로 순서 의존은 없지만, 테이블이 없으면 피드 라우트가 깨진다)
- 트랙 A의 `20260726000000`(랭킹)도 미적용 상태다
