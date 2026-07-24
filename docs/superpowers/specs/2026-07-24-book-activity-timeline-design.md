# 책별 활동 타임라인 (Book Activity Timeline)

- 작성일: 2026-07-24
- 상태: 설계 승인됨 → 구현 계획(writing-plans) 대기

## 배경 / 문제

- 지금 댓글·좋아요는 **피드(활동)** 에만 있고, **책 상세(서재)** 에는 그 책에 대한 활동·반응이 모이지 않는다.
- 핵심 관찰: 모든 피드 활동은 이미 특정 책에 묶여 있다(`activities.book_id` NOT NULL). 즉 "피드 활동에 달린 댓글"은 사실상 "그 책에 대한 그 순간의 기록"이다.
- 목표: 각 책 상세에 **"그 책에 대한 나의 여정(활동 + 댓글 + 좋아요)"** 을 시간순으로 모아, 서재에 기록이 쌓이는 경험을 만든다.

## 요구사항 (확정)

1. **책별 여정 타임라인** — 책 상세에 그 책의 활동(`book_added` / `book_completed` / `review_added`)을 시간순 표시
2. **공개 범위** — 방문자도 봄. 책의 공개/비공개 설정을 따른다
3. **상호작용** — 책 상세에서 바로 댓글·좋아요 (피드와 동일 동작)

## 스코프

| 포함 | 제외 (별개 과제) |
|---|---|
| `GET /api/books/[id]/activities` | "내 활동만 모아보기" 전체 피드 필터 |
| 책 상세(protected+public)에 "이 책의 기록" 섹션 | 책 자체에 직접 다는 댓글(활동과 무관한 리뷰) |
| `ActivityCard` 재사용(댓글·좋아요 포함) + `hideBook` 옵션 | `comments` 잔재 테이블 정리(이 기능과 무관) |

## 설계

### 데이터 흐름

```
책 상세 페이지 → GET /api/books/[id]/activities
  → buildActivityItems(activities, currentUserId)  // 프로필·좋아요 조합
  → ActivityList (일반화된 목록)
  → ActivityCard (댓글·좋아요 포함, 재사용 / hideBook)
```

### ① API — `GET /api/books/[id]/activities?limit&offset`

- `activities`를 `book_id = [id]`로 필터, `created_at` 내림차순
- `books`는 사용자별 레코드이므로, 그 책의 활동 = **그 책 소유자의 활동**(global 단위 아님)
- **조합 로직 공용화**: 현재 `app/api/feed/route.ts`에 있는 "활동 + 프로필 + 좋아요(count/isLiked)" 조합을 `buildActivityItems(activities, currentUserId)` 공용 함수로 추출해 feed·book API가 공유(중복 제거)
- 책 첨부(book 정보)는 책 상세 맥락이라 카드에서 생략(③ 참조)
- **공개범위**: 비공개 책의 타임라인은 소유자만 조회. `(public)` 경로는 공개 책만

### ② UI — `ActivityFeed` → `ActivityList` 일반화 + 책 상세 통합

- 현재 `widgets/activity/ui/ActivityFeed.tsx`는 `getFeed`가 하드코딩됨 → `queryKey`·`queryFn`를 prop으로 받는 **`ActivityList`** 로 일반화
  - 피드: `queryFn = getFeed`
  - 책: `queryFn = () => getBookActivities(bookId)`
- 책 상세 두 곳에 **"이 책의 기록"** 섹션(`<ActivityList/>`) 추가
  - `app/(protected)/books/[id]` (내 서재, 소유자) — 실제로는 `widgets/book/ui/BookDetailContent.tsx`
  - `app/(public)/[username]/[bookId]` (방문자 공개 뷰)
- `ActivityCard`는 그대로 재사용 (내부 `LikeButton`·`CommentSection`이 `activityId` 기반이라 독립적)

### ③ 카드 책 첨부 중복 처리

- `ActivityCard`에 **`hideBook?: boolean`** prop 추가 → 책 상세에선 표지/제목 첨부를 숨긴다(같은 책 반복 방지). 피드는 기존 그대로.

### ④ 공개범위 · 권한

- 책 공개/비공개 설정 존중(위 ①)
- 댓글·좋아요 작성은 로그인 필요 — 기존 `activity_comments` / `activity_likes` RLS·API 그대로 사용

### ⑤ 엣지 · 에러

- 활동 0개: "아직 이 책의 기록이 없어요" 빈 상태
- 비공개 책 무단 접근: 404

## 파일 변경 (예상)

**신규**
- `app/api/books/[id]/activities/route.ts` — 책별 활동 조회
- `entities/activity/api/*` — `getBookActivities(bookId, {limit, offset})` 추가
- 공용 `buildActivityItems()` — `app/api/_helpers/activity.ts`(기존 헬퍼 존재)에 추가 검토

**수정**
- `widgets/activity/ui/ActivityFeed.tsx` → `ActivityList`로 일반화(또는 `ActivityList` 신설 + `ActivityFeed`는 얇은 래퍼)
- `widgets/activity/ui/ActivityCard.tsx` → `hideBook` prop
- `widgets/book/ui/BookDetailContent.tsx` + `app/(public)/[username]/[bookId]/page.tsx` → "이 책의 기록" 섹션
- `app/api/feed/route.ts` → 조합 로직을 `buildActivityItems` 사용으로 교체

## 테스트

- **vitest**: `book_id` 필터 정확성, 비공개 책 권한(소유자만), `buildActivityItems` 조합 결과
- **Playwright e2e**: 책 상세에서 활동 목록 표시 + 댓글 작성 흐름

## 결정 사항

- `hideBook` 도입 — 책 상세에선 카드의 책 표지 숨김 (승인)
- 타임라인 단위 = "그 책(내 서재 항목)의 활동" = 소유자 활동. global 책 단위 아님
