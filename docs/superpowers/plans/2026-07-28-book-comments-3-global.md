# 책 단위 댓글 ③ 전역 책 스레드 · 옛 경로 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전역 책(`global_books`)에도 댓글 스레드를 열고, 활동 단위로 남아 있던 옛 읽기 경로를 걷어내 대화 창구를 책 하나로 통일한다.

**Architecture:** 계획 1에서 `book_comments`는 이미 `global_book_id`를 지원하고 프론트의 `CommentTarget`·`commentApi`·`commentKeys`도 `globalBook` 분기를 갖고 있다. 남은 것은 그 분기를 실제로 태울 라우트와 UI, 그리고 알림 경로다. 마지막으로 활동 상세를 책 상세로 리다이렉트시키고 활동 댓글·좋아요 API를 제거한다.

**Tech Stack:** Next.js 16 (App Router) · Supabase(Postgres + RLS) · TanStack Query · Tailwind · vitest

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-25-book-level-comments-design.md`. 계획 1·2는 완료·main 병합됨.
- **전역 책 스레드는 순수 댓글만.** 활동 병합도, 한줄평 병합도 없다(스펙 27·36행). 여러 사람의 책이라 특정 사용자의 상태 변화가 존재하지 않는다.
- **새 댓글 배지도 없다**(스펙 35행 — 피드에 전역 책이 뜨지 않으므로 불필요). `book_thread_reads`는 개인 책 전용으로 둔다.
- **옛 알림을 깨뜨리지 않는다.** `target_type = 'activity'`인 과거 알림은 계속 `/feed/{target_id}`로 이동한다. 그 경로가 책 상세로 리다이렉트되므로 결과적으로 올바른 스레드에 닿는다.
- `activity_comments` / `activity_likes` **테이블은 삭제하지 않는다**(스펙 33행 — 보존만). 이 계획은 **읽기 경로**만 걷어낸다.
- 시각 비교에 `localeCompare`를 쓰지 않는다 — `compareIsoTime`을 쓴다.
- 집계 쿼리에 `is_public`을 직접 명시한다.
- 커밋 메시지에 `Co-Authored-By` 트레일러를 넣지 않는다.

## File Structure

| 파일 | 책임 |
|---|---|
| `apps/page0127/app/api/global-books/[id]/comments/route.ts` (Create) | 전역 책 스레드 목록·작성 |
| `apps/page0127/app/api/global-books/[id]/comments/[commentId]/route.ts` (Create) | 수정·삭제 |
| `apps/page0127/src/widgets/book/ui/GlobalBookCommentSection.tsx` (Create) | 전역 책 페이지의 댓글 스레드 |
| `apps/page0127/app/(public)/books/info/[id]/page.tsx` (Modify) | 스레드 섹션 배치 |
| `apps/page0127/src/entities/notification/model/types.ts` (Modify) | `global_book` 타입 추가 |
| `apps/page0127/src/features/notification/ui/NotificationList.tsx` (Modify) | 라우팅 분기 |
| `apps/page0127/src/features/notification/ui/NotificationPage.tsx` (Modify) | 라우팅 분기 |
| `apps/page0127/app/(protected)/feed/[activityId]/page.tsx` (Modify) | 책 상세로 리다이렉트 |
| `apps/page0127/app/api/activities/[id]/comments/**` (Delete) | 활동 댓글 API |
| `apps/page0127/app/api/activities/[id]/likes/route.ts` (Delete) | 활동 좋아요 API |
| `apps/page0127/src/widgets/activity/ui/ActivityDetail.tsx` (Delete) | 활동 상세 위젯 |
| `apps/page0127/src/features/like/ui/LikeButton.tsx` (Delete) | 활동 좋아요 버튼 |

---

## Task 1: 전역 책 댓글 목록·작성 API

**Files:**
- Create: `apps/page0127/app/api/global-books/[id]/comments/route.ts`

**Interfaces:**
- Consumes: `buildCommentTree`·`classifyBookCommentError`·`CommentRow`·`ProfileRow` (`app/api/_helpers/bookComments.ts`)
- Produces: `GET /api/global-books/[id]/comments` → `CommentNode[]`, `POST` → `CommentNode` (201). Task 2·3이 쓴다.

**개인 책 라우트와 다른 점 세 가지:**
1. 대상 컬럼이 `global_book_id`다.
2. **소유자가 없다** → 알림은 부모 댓글 작성자에게만 간다(스펙 243행).
3. RLS가 전역 책 댓글을 누구나 볼 수 있게 하므로(계획 1 `20260725000003`), 조회에 별도 권한 분기가 없다.

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/global-books/[id]/comments/route.ts
import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
} from '../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../_helpers/bookComments';

type Params = {
  params: Promise<{ id: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

const fetchProfiles = async (
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  rows: CommentRow[]
): Promise<ProfileRow[]> => {
  const userIds = [
    ...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)),
  ];
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, username, photo_url')
    .in('id', userIds);

  return (data ?? []) as ProfileRow[];
};

/**
 * GET /api/global-books/[id]/comments
 * 전역 책 스레드 — 순수 댓글만. 활동 병합이 없다(여러 사람의 책이라 특정 사용자의
 * 상태 변화가 존재하지 않는다).
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('book_comments')
      .select(COMMENT_COLUMNS)
      .eq('global_book_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const rows = (data ?? []) as CommentRow[];
    const profiles = await fetchProfiles(supabase, rows);

    return successResponse(buildCommentTree(rows, profiles));
  } catch (error) {
    console.error('전역 책 댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/global-books/[id]/comments
 * 전역 책 스레드에 댓글 작성
 *
 * 학습 포인트:
 * - 개인 책과 달리 **소유자가 없다.** 그래서 알림은 대댓글일 때 부모 댓글
 *   작성자에게만 간다. 루트 댓글은 알릴 상대가 없다.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content, parentCommentId } = await request.json();

    if (!content?.trim()) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .insert({
        global_book_id: id,
        user_id: user!.id,
        parent_comment_id: parentCommentId ?? null,
        content: content.trim(),
      })
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    const profiles = await fetchProfiles(supabase, [comment as CommentRow]);
    const [node] = buildCommentTree([comment as CommentRow], profiles);

    // 대댓글이면 부모 댓글 작성자에게 알린다(본인 제외). 전역 책은 소유자가 없다.
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('book_comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();

      if (parent?.user_id && parent.user_id !== user!.id) {
        await supabase.from('notifications').insert({
          user_id: parent.user_id,
          type: 'comment',
          actor_id: user!.id,
          target_id: id,
          target_type: 'global_book',
        });
      }
    }

    return successResponse(node, 201);
  } catch (error) {
    console.error('전역 책 댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: 로컬에서 호출 확인**

전역 책 id를 하나 고른다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "select id, title from global_books limit 3;"
```

dev 서버를 띄운 뒤 브라우저 콘솔(로그인 상태)에서:
```js
await fetch('/api/global-books/<전역책_id>/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '전역 스레드 테스트' }),
}).then(r => r.json())
```
Expected: 201과 함께 댓글 노드. 이어서 GET으로 조회되면 성공.

DB로도 확인한다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "select id, book_id, global_book_id, content from book_comments where global_book_id is not null;"
```
Expected: `book_id`는 NULL이고 `global_book_id`만 채워져 있다(계획 1의 CHECK 제약이 배타를 보장한다)

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/api/global-books"
git commit -m "feat(api): 전역 책 댓글 목록·작성 API 추가"
```

---

## Task 2: 전역 책 댓글 수정·삭제 API

**Files:**
- Create: `apps/page0127/app/api/global-books/[id]/comments/[commentId]/route.ts`

**Interfaces:**
- Consumes: `classifyBookCommentError`, `buildCommentTree`
- Produces: `PATCH` → `CommentNode`, `DELETE` → `{ message }`

**권한은 RLS에 맡긴다.** 계획 1의 UPDATE·DELETE 정책이 본인 댓글만 허용하고, UPDATE에는 대상 재지정을 막는 `WITH CHECK`가 걸려 있다. 앱에서 `user_id`를 다시 비교하지 않는다.

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/global-books/[id]/comments/[commentId]/route.ts
import { NextRequest } from 'next/server';

import { getCurrentUser, getSupabaseClient } from '../../../../_helpers/auth';
import {
  buildCommentTree,
  classifyBookCommentError,
} from '../../../../_helpers/bookComments';
import { errorResponse, successResponse } from '../../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../../_helpers/bookComments';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

/**
 * PATCH /api/global-books/[id]/comments/[commentId]
 * 전역 책 댓글 수정 — 권한은 RLS가 판단한다(본인 댓글만).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content } = await request.json();
    if (!content?.trim()) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data, error } = await supabase
      .from('book_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('global_book_id', id)
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }
    if (!data) return errorResponse('댓글을 찾을 수 없습니다.', 404);

    const row = data as CommentRow;
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, nickname, username, photo_url')
      .eq('id', row.user_id ?? '');

    const [node] = buildCommentTree(
      [row],
      (profileRows ?? []) as ProfileRow[]
    );

    return successResponse(node);
  } catch (error) {
    console.error('전역 책 댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/global-books/[id]/comments/[commentId]
 * 전역 책 댓글 삭제 — 대댓글은 FK ON DELETE CASCADE 로 함께 지워진다.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error } = await supabase
      .from('book_comments')
      .delete()
      .eq('id', commentId)
      .eq('global_book_id', id);

    if (error) {
      const { message, status } = classifyBookCommentError(error);
      return errorResponse(message, status);
    }

    return successResponse({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('전역 책 댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: 남의 댓글을 못 고치는지 확인**

로컬 DB에서 다른 사용자의 전역 책 댓글 id를 찾아 PATCH를 시도한다.
```js
await fetch('/api/global-books/<전역책_id>/comments/<남의_댓글_id>', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '침입' }),
}).then(r => r.status)
```
Expected: 404 (RLS가 행을 안 보여주므로 업데이트 대상이 0건 → `.single()`이 실패)

- [ ] **Step 4: 커밋**

```bash
git add "apps/page0127/app/api/global-books/[id]/comments/[commentId]"
git commit -m "feat(api): 전역 책 댓글 수정·삭제 API 추가"
```

---

## Task 3: 전역 책 페이지에 스레드 붙이기

**Files:**
- Create: `apps/page0127/src/widgets/book/ui/GlobalBookCommentSection.tsx`
- Modify: `apps/page0127/app/(public)/books/info/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 1·2의 라우트, `CommentForm`·`CommentItem` (`@/features/comment`), `commentKeys`·`CommentTarget` (`@/entities/comment`)
- Produces: `<GlobalBookCommentSection globalBookId={...} />`

**계획 1에서 이미 준비된 것:** `commentApi`가 `target.type === 'globalBook'`이면 `API_ENDPOINTS.globalBooks.*`로 분기한다. 이 Task는 그 분기를 처음으로 실제 호출한다.

- [ ] **Step 1: 스레드 컴포넌트**

```tsx
// apps/page0127/src/widgets/book/ui/GlobalBookCommentSection.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { commentApi, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm, CommentItem } from '@/features/comment';

import type { CommentTarget } from '@/entities/comment';

type GlobalBookCommentSectionProps = {
  globalBookId: string;
};

/**
 * 전역 책 스레드 — 순수 댓글만
 *
 * 학습 포인트:
 * - 개인 책 스트림과 달리 활동 마커가 없다. 전역 책은 여러 사람이 담는 "책 그 자체"라
 *   특정 사용자의 상태 변화(담음·완독)가 존재하지 않는다.
 * - 대상만 globalBook 으로 넘기면 commentApi 가 알아서 전역 엔드포인트로 간다
 *   (계획 1에서 CommentTarget 구별 유니온을 만들어 둔 덕이다).
 */
export const GlobalBookCommentSection = ({
  globalBookId,
}: GlobalBookCommentSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'globalBook', id: globalBookId };

  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentKeys.byTarget(target),
    queryFn: () => commentApi.getComments(target),
  });

  const totalCount = comments.reduce(
    (count, comment) => count + 1 + (comment.replies?.length ?? 0),
    0
  );

  return (
    <section className='border-t border-line pt-6'>
      <h2 className='heading-2 text-text-strong'>이 책 이야기 {totalCount}</h2>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='size-6 animate-spin text-muted-foreground' />
        </div>
      ) : comments.length === 0 ? (
        <p className='mt-4 rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이야기가 없어요. 먼저 남겨보세요.
        </p>
      ) : (
        <div className='mt-4 space-y-3'>
          {comments.map((comment) => (
            <div key={comment.id} className='space-y-3'>
              <CommentItem comment={comment} target={target} />
              {comment.replies?.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  target={target}
                  isReply
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {currentUser && (
        <div className='mt-4 border-t border-line-soft pt-4'>
          <CommentForm target={target} placeholder='이 책에 대해 남기기…' />
        </div>
      )}
    </section>
  );
};
```

- [ ] **Step 2: 페이지에 배치**

`app/(public)/books/info/[id]/page.tsx`의 "책 소개" 섹션 **아래**, 비로그인 안내 블록 **위**에 넣는다.

```diff
             </section>
           )}
 
+          <GlobalBookCommentSection globalBookId={book.id} />
+
           {/* 비로그인 방문자 — 여기서 서비스를 처음 만난다 */}
           {!user && (
```

import를 추가한다(파일 위쪽 import 블록의 위젯 그룹에).

```ts
import { GlobalBookCommentSection } from '@/widgets/book/ui/GlobalBookCommentSection';
```

- [ ] **Step 3: 타입 검사·린트·테스트**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test`
Expected: PASS

- [ ] **Step 4: 눈으로 확인 (이 Task의 실질적 검수)**

`/books/info/{전역책_id}`를 열어 확인한다.

1. 로그인 상태에서 댓글을 쓰면 새로고침 없이 목록에 나타난다
2. 답글이 부모 아래 들여쓰기로 붙고, 답글의 답글은 막힌다
3. 수정·삭제가 동작한다
4. **로그아웃 상태에서도 댓글이 보이되 입력창이 없다** (전역 책은 공개)
5. 작성자 이름·아바타를 누르면 프로필로 간다(계획 2의 `ProfileLink`)

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/widgets/book/ui/GlobalBookCommentSection.tsx "apps/page0127/app/(public)/books/info/[id]/page.tsx"
git commit -m "feat(book): 전역 책 페이지에 댓글 스레드 추가"
```

---

## Task 4: 알림에 전역 책 경로 추가

**Files:**
- Modify: `apps/page0127/src/entities/notification/model/types.ts`
- Modify: `apps/page0127/src/features/notification/ui/NotificationList.tsx`
- Modify: `apps/page0127/src/features/notification/ui/NotificationPage.tsx`

**Interfaces:**
- Consumes: Task 1이 만드는 `target_type: 'global_book'` 알림

- [ ] **Step 1: 타입에 `global_book` 추가**

`src/entities/notification/model/types.ts:20`을 바꾼다. 기존 값(`'activity'` 포함)은 지우지 않는다 — 옛 알림이 깨진다.

```diff
-export type NotificationTargetType = 'activity' | 'comment' | 'book';
+export type NotificationTargetType =
+  | 'activity' // 옛 알림 — 지우면 과거 알림이 깨진다
+  | 'comment'
+  | 'book'
+  | 'global_book';
```

- [ ] **Step 2: 두 화면의 클릭 핸들러에 분기 추가**

`NotificationList.tsx`와 `NotificationPage.tsx` 각각, `target_type === 'book'` 분기 **바로 아래**에 넣는다.

```diff
     } else if (notification.target_type === 'book' && notification.target_id) {
       router.push(`/books/${notification.target_id}`);
+    } else if (
+      notification.target_type === 'global_book' &&
+      notification.target_id
+    ) {
+      router.push(`/books/info/${notification.target_id}`);
     }
```

- [ ] **Step 3: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 4: 알림이 실제로 도착하고 이동하는지 확인**

계정 A로 전역 책에 댓글을 쓰고, 계정 B로 그 댓글에 답글을 단다. 계정 A의 알림 목록에서 그 알림을 눌러 `/books/info/{id}`로 가는지 본다.

DB로도 확인한다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "select type, target_type, target_id from notifications order by created_at desc limit 5;"
```
Expected: `target_type = 'global_book'` 행이 있다

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/src/entities/notification apps/page0127/src/features/notification
git commit -m "feat(notification): 전역 책 스레드 알림 라우팅 추가"
```

---

## Task 5: 옛 활동 경로 정리

**Files:**
- Modify: `apps/page0127/app/(protected)/feed/[activityId]/page.tsx`
- Delete: `apps/page0127/app/api/activities/[id]/comments/route.ts`
- Delete: `apps/page0127/app/api/activities/[id]/comments/[commentId]/route.ts`
- Delete: `apps/page0127/app/api/activities/[id]/likes/route.ts`
- Delete: `apps/page0127/src/widgets/activity/ui/ActivityDetail.tsx`
- Delete: `apps/page0127/src/features/like/ui/LikeButton.tsx`
- Modify: `apps/page0127/src/widgets/activity/index.ts`
- Modify: `apps/page0127/src/features/like/ui/index.ts`
- Modify: `apps/page0127/src/entities/like/api.ts`
- Modify: `apps/page0127/src/shared/config/endpoints.ts`

**왜 페이지를 지우지 않고 리다이렉트하나:** `target_type = 'activity'`인 과거 알림이 `/feed/{target_id}`를 가리킨다. 페이지를 없애면 그 알림이 전부 404가 된다. 활동 id로 책을 찾아 책 상세로 보내면 옛 링크가 살아난 채로 대화 창구는 하나가 된다.

- [ ] **Step 1: 활동 상세를 책 상세로 리다이렉트**

`app/(protected)/feed/[activityId]/page.tsx`를 통째로 아래로 교체한다.

```tsx
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

type PageProps = {
  params: Promise<{ activityId: string }>;
};

/**
 * 옛 활동 상세 — 이제 대화는 책 하나로 모인다.
 *
 * 이 경로를 지우지 않는 이유: target_type='activity'인 과거 알림이 여기를 가리킨다.
 * 활동이 속한 책의 상세(/{username}/{bookId})로 보내 옛 링크를 살려둔다.
 * RLS가 공개 책·본인 책만 보여주므로, 못 찾으면 권한이 없거나 지워진 활동이다.
 */
const LegacyActivityRedirect = async ({ params }: PageProps) => {
  const { activityId } = await params;
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from('activities')
    .select('book_id')
    .eq('id', activityId)
    .single();

  if (!activity?.book_id) notFound();

  const { data: book } = await supabase
    .from('books')
    .select('id, user_id')
    .eq('id', activity.book_id)
    .single();

  if (!book) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', book.user_id)
    .single();

  if (!profile?.username) notFound();

  redirect(`/${profile.username}/${book.id}`);
};

export default LegacyActivityRedirect;
```

- [ ] **Step 2: 옛 API·컴포넌트 삭제**

```bash
git rm -r "apps/page0127/app/api/activities/[id]/comments"
git rm "apps/page0127/app/api/activities/[id]/likes/route.ts"
git rm apps/page0127/src/widgets/activity/ui/ActivityDetail.tsx
git rm apps/page0127/src/features/like/ui/LikeButton.tsx
```

- [ ] **Step 3: 배럴과 잔여 참조 정리**

- `src/widgets/activity/index.ts`에서 `export * from './ui/ActivityDetail';` 줄을 지운다.
- `src/features/like/ui/index.ts`에서 `export * from './LikeButton';`을 지운다.
- `src/entities/like/api.ts`에서 활동 좋아요용 `likeApi`를 지운다(`bookLikeApi`만 남긴다). `isAxiosError` import는 **그대로 둔다** — `bookLikeApi`가 409를 무시하는 데 계속 쓴다.
- `src/shared/config/endpoints.ts`의 `activities.comments` / `activities.commentDetail` / `activities.likes`를 지운다.

> ⚠️ **이름이 비슷한 세 컴포넌트를 헷갈리지 말 것.** 지우는 것은 `features/like/ui/LikeButton.tsx`(활동 좋아요) **하나뿐**이다.
> - `features/like/ui/BookRecordLikeButton.tsx` — 개인 책 좋아요(계획 2). **유지**
> - `widgets/book/ui/BookLikeButton.tsx` — 전역 책 좋아요(`/books/all` 등에서 씀). **유지**
>
> `LikeButton`은 계획 2에서 `ActivityCard`를 `BookRecordLikeButton`으로 바꾸면서 **이미 호출부가 사라졌다.** 배럴에서만 export되는 상태라 지워도 깨질 곳이 없다.

Run: `cd apps/page0127 && grep -rn "ActivityDetail\|activities\.likes\|activities\.comments" src app; grep -rn "\bLikeButton\b" src app | grep -v "BookLikeButton\|BookRecordLikeButton"`
Expected: 두 명령 모두 결과 없음

- [ ] **Step 4: 타입 검사·린트·테스트**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: 옛 알림이 살아 있는지 확인**

로컬 DB에 옛 활동 알림이 있으면 그것으로, 없으면 직접 만들어 확인한다.
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "
insert into notifications (user_id, type, actor_id, target_id, target_type)
select b.user_id, 'comment', b.user_id, a.id, 'activity'
from activities a join books b on b.id = a.book_id limit 1
returning id, target_id, target_type;"
```
알림 목록에서 그 알림을 눌러 `/feed/{activityId}` → 책 상세로 리다이렉트되는지 본다.

확인이 끝나면 지운다:
```bash
docker exec supabase_db_0127 psql -U postgres -d postgres -c "delete from notifications where target_type = 'activity';"
```

- [ ] **Step 6: e2e 회귀 확인**

Run: `cd apps/page0127 && npm run test:e2e`
Expected: PASS (기존 8개)

- [ ] **Step 7: 커밋**

```bash
git add -A apps/page0127
git commit -m "refactor(activity): 활동 단위 읽기 경로를 걷어낸다

옛 활동 상세는 책 상세로 리다이렉트해 과거 알림을 살려둔다.
activity_comments·activity_likes 테이블은 보존하고 읽기만 멈춘다."
```

---

## 계획 3 완료 상태

- 전역 책 페이지에서 댓글을 쓰고 읽을 수 있다. 알림도 그 페이지로 간다
- 대화 창구가 책 하나로 모였다 — 활동 단위 댓글·좋아요를 읽는 코드가 없다
- 옛 알림(`target_type='activity'`)은 책 상세로 리다이렉트되어 살아 있다
- `activity_comments` / `activity_likes` 테이블과 데이터는 그대로 남아 있다(되돌릴 여지)

## 남는 것 (이 재설계 밖)

- 책 소유자의 댓글 모더레이션(타인 댓글 삭제) — 스펙 34행에서 제외
- 전역 책 스레드의 새 댓글 배지 — 피드에 안 뜨므로 불필요(스펙 35행)
- `#comment-{commentId}` 앵커 스크롤 — 스펙 237행에 있으나 계획 1~3에서 구현하지 않았다. 알림은 현재 페이지 상단으로만 이동한다
