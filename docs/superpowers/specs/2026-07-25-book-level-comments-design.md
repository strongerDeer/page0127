# 책 단위 댓글 재설계 (Book-level Comments)

- 작성일: 2026-07-25
- 상태: 설계 승인됨 → 구현 계획(writing-plans) 대기
- 선행 문서: [2026-07-24-book-activity-timeline-design.md](./2026-07-24-book-activity-timeline-design.md)

## 배경 / 문제

책별 활동 타임라인(2026-07-24)을 붙이고 나서 드러난 문제다.

댓글·좋아요가 **활동(activity) 단위**로 저장된다(`activity_comments.activity_id`). 그런데 한 책에는
`book_added` / `review_added` / `book_completed` 활동이 차례로 쌓인다. 결과적으로 **같은 책에 대한 대화가
활동 개수만큼 갈라진다.** 책 상세를 열면 카드 3장에 각각 별도의 댓글 스레드가 붙어 있고, 피드에서도
같은 책이 카드 3장으로 따로 올라온다.

목표: **책 하나에 대화 한 줄기.** 상태 변화는 그 줄기 중간에 표시되는 항목이 된다.

## 확정된 요구사항

1. **댓글은 책에 직접 붙는다.** 활동이 아니라 책이 댓글의 대상이다.
2. **대상은 두 종류.** 개인 서재 책(`books.id`)과 전역 책(`global_books.id`) 각각 별도 스레드를 갖는다.
3. **책 상세 = 병합 스트림.** 활동(상태 변화)과 댓글을 시간순으로 한 줄기에 섞어 보여준다.
   상태 변화는 `activities`에 이미 있으므로 따로 저장하지 않는다.
4. **피드는 책마다 카드 1장.** 같은 책의 오래된 활동은 피드에서 접힌다(최신 상태 변화만 노출).
5. **피드 정렬은 최신 상태 변화 시각순**, 여기에 **새 댓글 배지**를 더한다.
6. **좋아요도 책 단위로 통합**한다(댓글과 숫자 기준을 일치시키기 위해).
7. **전역 책 스레드는 순수 댓글만.** 활동 병합 없음(여러 사람의 책이라 특정 사용자의 상태 변화가 없다).

## 스코프

| 포함 | 제외 (별개 과제) |
|---|---|
| `book_comments` 테이블 + 개인/전역 두 대상 | `activity_comments` / `activity_likes` 테이블 **삭제** (보존만) |
| `activities` + 댓글 병합 스트림 (책 상세) | 책 소유자의 댓글 모더레이션(타인 댓글 삭제) |
| 피드 책별 중복 제거 + 카드 재구성 | 전역 책 스레드의 새 댓글 배지 (피드에 안 뜨므로 불필요) |
| 책 단위 좋아요 통합 + 기존 좋아요 이관 | 전역 책 스레드에 활동/한줄평 병합 |
| 기존 `activity_comments` 이관 | 피드 자체의 정렬 알고리즘 변경(추천·인기순 등) |
| 새 댓글 배지 (`book_thread_reads`) | |
| 알림 경로 수정 | |

## 왜 이 구조인가 (검토한 대안)

| 갈림길 | 채택 | 버린 안과 이유 |
|---|---|---|
| 댓글 대상 | 책에 직접 | *읽기만 통합*은 새 댓글을 어느 활동에 붙일지 결정할 수 없다 |
| 피드 중복 | 책별 최신 활동 1장 | *카드마다 전체 스레드 펼치기*는 같은 댓글이 카드 수만큼 중복 노출된다 |
| 테이블 구조 | 한 테이블 + 대상 컬럼 2개 | *테이블 2개*는 라우트·훅·컴포넌트가 2벌. *폴리모픽*은 FK 무결성이 없어 책 삭제 시 고아 댓글이 남는다 |
| 좋아요 | 책 단위 통합 | *방치*하면 카드에 `댓글 12`(책 전체)와 `♡ 2`(최신 활동)가 나란히 떠 숫자 기준이 어긋난다 |
| 피드 정렬 | 상태 변화 시각순 + 배지 | *댓글로도 올림*은 인기 책이 상단을 점유하고 순서가 자꾸 뒤집혀 스크롤 위치를 잃는다 |

## 설계

### ① 데이터 모델

```sql
-- 통합 댓글 (개인 책 / 전역 책 공용)
CREATE TABLE book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID REFERENCES books(id)        ON DELETE CASCADE,
  global_book_id UUID REFERENCES global_books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT book_comments_one_target CHECK (num_nonnulls(book_id, global_book_id) = 1)
);

CREATE INDEX idx_book_comments_book_id        ON book_comments(book_id);
CREATE INDEX idx_book_comments_global_book_id ON book_comments(global_book_id);
CREATE INDEX idx_book_comments_parent_id      ON book_comments(parent_comment_id);
CREATE INDEX idx_book_comments_created_at     ON book_comments(created_at);

-- 개인 서재 책 좋아요
-- 이름 주의: book_likes는 이미 전역 책(global_books) 좋아요로 점유되어 있다
--            (/books/all, /api/books/like). 그래서 개인 책은 book_record_likes.
CREATE TABLE book_record_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

-- 스레드 열람 시각 (새 댓글 배지용)
CREATE TABLE book_thread_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
```

**트리거 2개**

1. **1depth 제한** — 기존 `check_comment_depth()`와 같은 규칙(대댓글의 대댓글 금지). `book_comments`용
   함수를 따로 만든다(기존 함수는 `activity_comments`를 참조하므로 재사용 불가).
2. **부모-대상 일치 검증** — `parent_comment_id`가 가리키는 댓글의 `book_id`/`global_book_id`가
   자신과 같아야 한다. A책 스레드의 댓글이 B책 댓글의 답글로 붙는 것을 DB에서 차단한다.

`updated_at` 갱신은 기존 `update_updated_at_column()` 트리거를 그대로 붙인다.

### ② RLS

[20260725000000_public_book_activity_rls.sql](../../../supabase/migrations/20260725000000_public_book_activity_rls.sql)의
패턴을 그대로 따른다 — "볼 수 있는 대상의 댓글만 볼 수 있다".

- **SELECT**: `global_book_id`가 있으면 누구나(전역 책은 공개). `book_id`가 있으면 그 책이
  *본인 소유 · 팔로우한 사용자 · `is_public = true`* 중 하나일 때.
- **INSERT**: `auth.uid() = user_id` **그리고** 위 SELECT 조건을 만족하는 대상일 때만.
  (비공개 책 스레드에는 소유자만 쓸 수 있다)
- **UPDATE / DELETE**: 작성자 본인만.
- `book_record_likes`: SELECT 누구나, INSERT/DELETE는 본인 행만.
- `book_thread_reads`: 전부 본인 행만(SELECT 포함 — 남의 열람 시각은 볼 이유가 없다).

### ③ 피드 중복 제거 — 뷰

supabase-js 쿼리 빌더로는 `DISTINCT ON`을 쓸 수 없다. RPC로 바꾸면
[app/api/feed/route.ts](../../../apps/page0127/app/api/feed/route.ts)를 통째로 다시 써야 하므로,
뷰를 두어 기존 코드 모양을 유지한다.

```sql
CREATE VIEW book_latest_activities WITH (security_invoker = true) AS
SELECT DISTINCT ON (book_id) *
FROM activities
ORDER BY book_id, created_at DESC;
```

```diff
- .from('activities')
+ .from('book_latest_activities')
```

- `security_invoker = true` — 밑단 `activities` 테이블의 RLS가 그대로 적용된다. 뷰가 권한 우회
  구멍이 되지 않는다.
- 책 하나의 소유자는 한 명이므로, 중복 제거 후에 `user_id`로 거르는 순서여도 결과는 같다.
- [20260725000001_lock_down_function_privileges.sql](../../../supabase/migrations/20260725000001_lock_down_function_privileges.sql)에서
  기본 권한을 좁혀두었으므로, 뷰에도 `GRANT SELECT ... TO anon, authenticated`를 명시한다.

### ④ API

라우트는 얇은 껍데기고, 실제 로직은 `app/api/_helpers/bookComments.ts` 공용 함수가 갖는다.
대상이 `book_id`냐 `global_book_id`냐만 다르다.

| 라우트 | 용도 |
|---|---|
| `GET · POST /api/books/[id]/comments` | 개인 책 스레드 |
| `PATCH · DELETE /api/books/[id]/comments/[commentId]` | 수정·삭제 |
| `GET · POST /api/global-books/[id]/comments` | 전역 책 스레드 |
| `PATCH · DELETE /api/global-books/[id]/comments/[commentId]` | 수정·삭제 |
| `GET /api/books/[id]/stream` | 병합 스트림 (활동 + 댓글) |
| `POST · DELETE /api/books/[id]/likes` | 책 단위 좋아요 |
| `POST /api/books/[id]/thread-read` | 열람 시각 upsert |

**경로 주의**: 기존 `/api/books/like`(전역 책 좋아요)와 신규 `/api/books/[id]/likes`(개인 책)가
나란히 선다. Next.js는 정적 세그먼트를 동적보다 우선하므로 충돌하지 않지만, 읽는 사람이 헷갈리지
않도록 신규는 복수형 `likes`로 기존 `/api/activities/[id]/likes`와 맞췄다.

**`GET /api/books/[id]/stream` 응답**

```ts
type StreamItem =
  | { kind: 'activity'; id: string; activityType: ActivityType; content: string | null; createdAt: string }
  | { kind: 'comment';  id: string; content: string; createdAt: string; updatedAt: string;
      parentCommentId: string | null; user: { id: string; nickname: string | null; photoUrl: string | null };
      replies: StreamComment[] };
```

- 활동은 한 책당 보통 3~10개이므로 **전부** 싣는다.
- 댓글은 **최근 50개**만 싣고, 더 있으면 `hasMore: true`와 함께 `created_at` 커서로 "이전 댓글 더보기".
- 정렬: `created_at` 오름차순(스레드는 위에서 아래로 시간이 흐른다). 대댓글은 부모 아래에 중첩.

**피드 응답 추가 필드**

```ts
{ bookLikes: { count, isLiked },
  commentCount: number,
  newCommentCount: number,          // last_read_at 이후 + 내가 쓴 것 제외
  bookEvents: { activityType, createdAt }[],   // "담음 7/01 · 리뷰 7/20 · 완독 7/24"
  reviewContent: string | null }               // 최신 활동이 완독이어도 리뷰 본문을 보여주기 위함
```

`bookEvents`·`reviewContent`는 피드가 **책별 최신 활동 1개만** 조회하는 것과 모순되므로, 화면에 뜬
`book_id` 목록으로 **활동 요약을 배치 조회하는 쿼리 1회**를 추가한다. "중복 제거"와 "맥락 보존"을
동시에 얻기 위한 값이다.

> **미결 사항 (계획 2 착수 전에 정할 것)**: `reviewContent`는 `review_added` 활동을 전제하는데,
> `createActivity` 호출처는 `app/api/books/route.ts:107`(`book_added`)과
> `app/api/books/[id]/route.ts:80`(`book_completed`, 조건부) 딱 두 곳뿐이다. **`review_added`는
> 생성하는 코드가 아예 없어 데이터가 0건이다.** 따라서 지금 그대로 구현하면 `reviewContent`는 항상
> `null`이고, 스트림의 "리뷰를 남겼어요" 마커도 절대 나타나지 않는다. 둘 중 하나를 골라야 한다:
> (a) `books.one_line_review`를 카드 본문으로 쓴다(오늘 바로 값이 있다. 단 시각 정보가 없어 스트림
> 마커로는 못 쓴다), (b) 한줄평/리뷰 저장 시 `review_added` 활동을 생성하는 코드를 추가한다(스코프
> 증가, 과거 리뷰는 소급 생성 안 됨).

`buildActivityItems`는 `activity_likes` 대신 `book_record_likes`를 받도록 바꾼다.

### ⑤ UI

`features/comment`의 축을 활동에서 대상으로 바꾸는 것이 핵심이다.

```diff
- CommentSection({ activityId })
+ CommentSection({ target: { type: 'book' | 'globalBook', id } })
```

`CommentForm` / `CommentList` / `CommentItem`이 `target`을 그대로 전달받고,
`entities/comment`의 `api.ts` · `queryKeys.ts`도 같은 축으로 바뀐다.

| 파일 | 변경 |
|---|---|
| `widgets/book/ui/BookActivitySection.tsx` | → `BookStreamSection` — 활동 마커와 댓글이 섞인 스트림 렌더 |
| `widgets/book/ui/BookStreamEvent.tsx` (신규) | `● 7/24 완독했어요 ★4` 한 줄짜리 상태 변화 마커 |
| `widgets/activity/ui/ActivityCard.tsx` | 책 카드로 재구성 |
| `app/(public)/books/info/[id]/page.tsx` | 책 소개 아래에 전역 댓글 스레드 |
| `widgets/activity/ui/ActivityList.tsx` | 변경 없음 — 카드만 바뀐다 |

**책 카드 구성** (피드)

```
경민  완독했어요                     7/24
┌──────────────────────────────┐
│ [표지]  미드나잇 라이브러리      │
│         매트 헤이그 · ★4        │
└──────────────────────────────┘
담음 7/01 · 리뷰 7/20 · 완독 7/24   ← bookEvents (활동 3개 요약)
"다시 살 수 있다면 어떤 삶을 고를까…"
♡ 8   💬 댓글 4 ▾   [새 댓글 2]
```

펼치면 책 상세와 **같은 병합 스트림 컴포넌트**를 재사용한다.

`hideBook`(선행 문서에서 도입)은 그대로 유지한다 — 책 상세에서는 표지 첨부를 숨긴다.

### ⑥ 알림

- `notifications.target_type`에 `'book'` / `'global_book'`을 추가한다.
- 라우팅: 개인 책은 소유자면 `/books/{id}`, 방문자면 `/{username}/{bookId}`. 전역 책은
  `/books/info/{id}`. 둘 다 `#comment-{commentId}` 앵커로 해당 댓글로 스크롤한다.
- **기존 알림은 건드리지 않는다.** `target_type = 'activity'`인 과거 알림은 지금처럼
  `/feed/{target_id}`로 계속 이동한다. 라우팅 분기에 옛 값을 남겨둔다(안 그러면 옛 알림이 전부 깨진다).
- 알림 대상:
  - 개인 책 스레드 → 책 소유자 + 부모 댓글 작성자(본인 제외, 중복 제외)
  - 전역 책 스레드 → **부모 댓글 작성자만** (소유자가 없다)

### ⑦ 데이터 이관

**`id`를 그대로 옮기는 것이 핵심**이다. 그러면 `parent_comment_id`가 저절로 맞아떨어져 매핑 테이블이
필요 없다.

```sql
INSERT INTO book_comments (id, book_id, user_id, parent_comment_id, content, created_at, updated_at)
SELECT ac.id, a.book_id, ac.user_id, ac.parent_comment_id, ac.content, ac.created_at, ac.updated_at
FROM activity_comments ac
JOIN activities a ON a.id = ac.activity_id;

-- 좋아요: 같은 책의 여러 활동에 눌렀으면 1개로 병합
INSERT INTO book_record_likes (user_id, book_id, created_at)
SELECT al.user_id, a.book_id, MIN(al.created_at)
FROM activity_likes al
JOIN activities a ON a.id = al.activity_id
GROUP BY al.user_id, a.book_id
ON CONFLICT DO NOTHING;
```

**이관 순서 주의**: 두 트리거(1depth 제한, 부모-대상 일치)는 모두 부모 행을 조회한다. 그런데 위
`INSERT ... SELECT`는 단일 문이고 트리거는 행 단위로 도는데, 같은 문에서 앞서 삽입된 행이 트리거의
조회에 보이는지가 보장되지 않는다. 부모가 안 보이면 일치 트리거는 오탐으로 이관을 막고, 1depth
트리거는 반대로 검사를 통과시켜 버린다.

따라서 **트리거 2개는 ① 테이블 생성 마이그레이션이 아니라 ② 이관 마이그레이션의 맨 끝에서 만든다.**
이관 대상 데이터는 이미 `activity_comments`에서 두 규칙을 만족하므로 소급 검증이 필요 없고, 이관이
끝난 뒤 아래 쿼리로 위반 행이 0인지 확인한다.

```sql
-- 이관 검증: 부모와 대상이 다른 행이 있으면 안 된다
SELECT count(*) FROM book_comments c
JOIN book_comments p ON p.id = c.parent_comment_id
WHERE c.book_id IS DISTINCT FROM p.book_id
   OR c.global_book_id IS DISTINCT FROM p.global_book_id;
```

`activity_comments` / `activity_likes` 원본은 **삭제하지 않는다.** 앱이 더 이상 읽지 않을 뿐이다.
문제가 생기면 되돌릴 여지를 두고, 테이블 정리는 다음 라운드로 미룬다.

### ⑧ 엣지 · 에러

- 활동·댓글 모두 0 → "아직 이 책의 기록이 없어요"
- 비공개 책 스레드 무단 접근 → 404 (기존 책 상세 정책과 동일)
- 탈퇴 사용자 댓글 → `user_id SET NULL`.
  [20260103000003](../../../supabase/migrations/20260103000003_update_comments_for_account_deletion.sql)의
  기존 처리 방식을 그대로 따른다. 표시는 기존 규칙대로 `nickname || username`.
- 대댓글 깊이 초과 → 400 "대댓글의 대댓글은 작성할 수 없습니다."
- 비로그인 방문자 → 스레드는 보이되 입력창 대신 로그인 유도

## 테스트

이 프로젝트의 vitest는 **순수 함수 전용**이다([vitest.config.ts](../../../apps/page0127/vitest.config.ts) —
`environment: 'node'`, Supabase를 띄우지 않아 CI에서 secrets가 필요 없다). 그래서 DB 제약·트리거·이관
SQL은 vitest로 검증할 수 없고, 로컬 Supabase에 psql로 직접 확인한다.

**vitest (순수 함수)**

- 댓글 계층 구조 빌드 — 대댓글 중첩, 닉네임 폴백(`nickname || username`), 탈퇴 사용자(`user` = null),
  부모가 없는 대댓글을 루트로 승격, `created_at` 오름차순
- 스트림 병합 정렬 — 활동과 댓글이 `created_at` 오름차순으로 섞이고, 동시각이면 활동이 앞
- `newCommentCount` — 내 댓글 제외, `last_read_at` 이후만
- `buildActivityItems` — `book_record_likes` 기준 `isLiked` 판정

**psql (로컬 Supabase, `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)**

- `book_comments` CHECK 제약 — 대상 0개/2개 모두 거부
- 부모-대상 일치 트리거 — 다른 책 댓글을 부모로 지정하면 거부
- 1depth 제한 트리거
- 이관 SQL — 댓글 수·부모 관계 보존, 좋아요 병합 개수(한 사람이 같은 책 활동 3개에 눌렀으면 1행)

**Playwright e2e**

기존 `e2e/` 스펙 3개는 전부 **비인증 공개 페이지 스모크**이고, 로그인 상태를 만드는 하네스가 없다.
댓글 작성은 로그인이 필요하므로 지금 구조로는 e2e를 쓸 수 없다. **인증 e2e 하네스 구축은 별개 과제**로
두고, 그 전까지는 아래를 수동 브라우저 확인으로 대신한다.

- 책 상세에서 댓글 작성 → 스트림에 즉시 나타남
- 같은 책에 활동이 여러 개여도 피드 카드는 1장
- 전역 책 페이지(`/books/info/[id]`)에서 댓글 작성

인증이 필요 없는 것만 e2e에 남긴다: 기존 3개 스펙이 계속 통과하는지(회귀 확인).

## 파일 변경 (예상)

**신규**

- `supabase/migrations/*_create_book_comments.sql` — 테이블 3개 + 인덱스 + RLS + 뷰 (**트리거 제외**)
- `supabase/migrations/*_migrate_activity_comments_to_book.sql` — 이관 → 검증 → **트리거 2개 생성**
- `app/api/books/[id]/comments/route.ts`, `.../[commentId]/route.ts`
- `app/api/global-books/[id]/comments/route.ts`, `.../[commentId]/route.ts`
- `app/api/books/[id]/stream/route.ts`
- `app/api/books/[id]/likes/route.ts`
- `app/api/books/[id]/thread-read/route.ts`
- `app/api/_helpers/bookComments.ts`
- `src/widgets/book/ui/BookStreamEvent.tsx`

**수정**

- `src/entities/comment/{api.ts,types.ts,model/queryKeys.ts}` — 대상 축으로 전환
- `src/features/comment/ui/*` — `target` prop
- `src/features/like/*` — 책 단위 좋아요
- `src/widgets/book/ui/BookActivitySection.tsx` → `BookStreamSection.tsx`
- `src/widgets/activity/ui/ActivityCard.tsx` — 책 카드
- `app/api/feed/route.ts` — 뷰 사용 + 요약 배치 조회 + 책 단위 좋아요
- `app/api/_helpers/buildActivityItems.ts`
- `app/(public)/books/info/[id]/page.tsx`
- `src/features/notification/ui/{NotificationList,NotificationPage}.tsx` — 라우팅 분기

**보존(읽지 않음)**

- `app/api/activities/[id]/comments/**`, `app/api/activities/[id]/likes/**` — 이관 후 사용 중단.
  제거는 다음 라운드.

## 결정 사항

- 댓글 대상은 책(개인 `books.id` / 전역 `global_books.id`) — 활동이 아니다
- 한 테이블 + 대상 컬럼 2개 + CHECK (승인)
- 책 상세는 활동·댓글 병합 스트림. 상태 변화는 따로 저장하지 않고 `activities`에서 읽는다
- 피드는 책별 최신 활동 1장. 정렬은 상태 변화 시각순 + 새 댓글 배지
- 좋아요도 책 단위 통합, 기존 좋아요는 책 기준으로 병합 이관
- 전역 책 스레드는 순수 댓글만
- 원본 테이블은 보존, 삭제는 다음 라운드
