# 책 단위 댓글 ① 코어 (테이블·이관·API·책 상세 스트림) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 댓글의 대상을 활동(activity)에서 책(book)으로 옮기고, 책 상세를 "활동 + 댓글이 시간순으로 섞인 하나의 스트림"으로 바꾼다.

**Architecture:** `book_comments` 한 테이블이 개인 서재 책(`book_id`)과 전역 책(`global_book_id`) 두 대상을 CHECK 제약으로 배타 처리한다. 기존 `activity_comments`는 `id`를 유지한 채 이관하여 `parent_comment_id` 매핑이 저절로 맞게 한다. API 라우트는 얇게 두고 계층 구조 빌드·스트림 병합 같은 판단 로직은 순수 함수로 분리해 vitest로 검증한다.

**Tech Stack:** Next.js 16 (App Router, Server Component 우선), Supabase(Postgres + RLS), TanStack Query, vitest(순수 함수), Playwright(e2e)

## Global Constraints

- 선행 설계 문서: `docs/superpowers/specs/2026-07-25-book-level-comments-design.md`
- 이 계획은 **개인 서재 책 스레드만** 다룬다. 전역 책 스레드(`global_book_id` 사용)와 피드 재구성은 계획 2·3 소관이다. 단 테이블·타입·RLS는 처음부터 두 대상을 모두 수용하도록 만든다.
- **커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 절대 넣지 않는다.**
- 마이그레이션 파일명 타임스탬프는 기존 최신(`20260725000002`)보다 뒤여야 한다.
- 트리거 2개(1depth 제한, 부모-대상 일치)는 **Task 1이 아니라 Task 2 끝에서** 만든다. 이유는 Task 2에 적혀 있다.
- `activity_comments` / `activity_likes` 원본 테이블은 **삭제하지 않는다.**
- vitest는 순수 함수 전용이다(`environment: 'node'`, Supabase 미기동). DB 제약·트리거 검증은 로컬 Supabase에 psql로 직접 확인한다.
- **이 계획은 새 e2e를 추가하지 않는다.** `e2e/`의 기존 3개 스펙(`auth-gate`, `public-pages`, `production-readiness`)은 전부 **비인증 공개 페이지 스모크**이고, 로그인 상태를 만드는 하네스(storageState 등)가 없다. 댓글 작성은 로그인이 필요하므로 지금 구조로는 e2e가 불가능하다. 인증 e2e 하네스 구축은 별개 과제로 두고, 여기서는 vitest(순수 로직) + psql(DB 제약) + 수동 브라우저 확인으로 검증한다.
- 로컬 Supabase DB 접속 문자열: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- 기존 코드 컨벤션을 따른다: `import` 정렬(simple-import-sort), 한국어 주석은 "학습 포인트"만, `successResponse`/`errorResponse` 헬퍼 사용.

---

## File Structure

**신규**

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20260725000003_create_book_comments.sql` | 테이블 3개 + 인덱스 + RLS (트리거 없음) |
| `supabase/migrations/20260725000004_migrate_comments_to_book.sql` | 이관 → 검증 → 트리거 2개 생성 |
| `apps/page0127/app/api/_helpers/bookComments.ts` | 댓글 행 → 계층 구조 변환 (순수 함수) |
| `apps/page0127/app/api/_helpers/bookComments.test.ts` | 위 함수 테스트 |
| `apps/page0127/app/api/_helpers/bookStream.ts` | 활동 + 댓글 시간순 병합 (순수 함수) |
| `apps/page0127/app/api/_helpers/bookStream.test.ts` | 위 함수 테스트 |
| `apps/page0127/app/api/books/[id]/comments/route.ts` | 개인 책 댓글 목록·작성 |
| `apps/page0127/app/api/books/[id]/comments/[commentId]/route.ts` | 댓글 수정·삭제 |
| `apps/page0127/app/api/books/[id]/stream/route.ts` | 병합 스트림 조회 |
| `apps/page0127/src/widgets/book/ui/BookStreamSection.tsx` | 책 상세 스트림 섹션 |
| `apps/page0127/src/widgets/book/ui/BookStreamEvent.tsx` | 상태 변화 한 줄 마커 |

**수정**

| 파일 | 변경 |
|---|---|
| `src/shared/config/endpoints.ts` | 책 댓글·스트림 엔드포인트 추가 |
| `src/entities/comment/types.ts` | `activityId` → `target` |
| `src/entities/comment/api.ts` | 대상 기반 호출 |
| `src/entities/comment/model/queryKeys.ts` | `byActivity` → `byTarget` |
| `src/features/comment/ui/{CommentSection,CommentForm,CommentList,CommentItem}.tsx` | `activityId` prop → `target` |
| `src/widgets/book/ui/BookDetailContent.tsx` | `BookActivitySection` → `BookStreamSection` |
| `src/widgets/activity/ui/ActivityCard.tsx` | `CommentSection`에 `target` 전달 |
| `src/widgets/book/ui/BookActivitySection.tsx` | 삭제 |

---

### Task 1: 테이블·인덱스·RLS 마이그레이션

**Files:**
- Create: `supabase/migrations/20260725000003_create_book_comments.sql`

**Interfaces:**
- Consumes: 기존 `books`, `global_books`, `auth.users` 테이블
- Produces: `book_comments`, `book_record_likes`, `book_thread_reads` 테이블. 이후 모든 Task가 이 스키마를 전제한다.

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 책 단위 댓글 재설계 ① 테이블
--
-- 배경: 댓글이 활동(activity) 단위로 저장되어 같은 책에 대한 대화가 활동 개수만큼
-- 갈라졌다. 대상을 책으로 옮긴다. 개인 서재 책(books)과 전역 책(global_books) 두
-- 종류를 한 테이블에서 다루되, CHECK로 정확히 하나만 채워지게 강제한다.
--
-- 트리거(1depth 제한, 부모-대상 일치)는 여기서 만들지 않는다. 다음 마이그레이션의
-- 이관 INSERT를 방해하기 때문이다. 자세한 이유는 20260725000004 주석 참고.
--
-- 작성일: 2026-07-25

CREATE TABLE IF NOT EXISTS public.book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id        UUID REFERENCES public.books(id)        ON DELETE CASCADE,
  global_book_id UUID REFERENCES public.global_books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES public.book_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- num_nonnulls: 인자 중 NULL이 아닌 개수. 정확히 하나만 채워져야 한다.
  CONSTRAINT book_comments_one_target CHECK (num_nonnulls(book_id, global_book_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_book_comments_book_id        ON public.book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_global_book_id ON public.book_comments(global_book_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_parent_id      ON public.book_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_book_comments_created_at     ON public.book_comments(created_at);

-- 이름 주의: book_likes는 이미 전역 책(global_books) 좋아요로 점유되어 있다
--            (/books/all, /api/books/like). 개인 서재 책은 book_record_likes.
CREATE TABLE IF NOT EXISTS public.book_record_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.book_thread_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, book_id)
);

-- updated_at 자동 갱신 (기존 함수 재사용)
DROP TRIGGER IF EXISTS update_book_comments_updated_at ON public.book_comments;
CREATE TRIGGER update_book_comments_updated_at
  BEFORE UPDATE ON public.book_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.book_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_record_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_thread_reads ENABLE ROW LEVEL SECURITY;

-- 조회: 전역 책 댓글은 누구나. 개인 책 댓글은 "그 책 행이 보이는 사람"만.
--
-- 범위를 books SELECT 정책(20260723000001: 공개 책 또는 본인)과 정확히 맞춘다.
-- activity_comments 정책(20260725000000)에는 팔로워 분기가 있지만, books 행 자체는
-- 팔로워에게 보이지 않는다. 댓글만 팔로워에게 열면 "책 정보는 안 보이는데 댓글은
-- 보이는" 어긋난 상태가 되므로, 더 좁은 쪽(책 행 가시성)에 맞춘다.
DROP POLICY IF EXISTS "Book comments are viewable by allowed viewers" ON public.book_comments;
CREATE POLICY "Book comments are viewable by allowed viewers"
  ON public.book_comments FOR SELECT
  USING (
    global_book_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.id = book_comments.book_id
        AND (b.is_public = true OR b.user_id = auth.uid())
    )
  );

-- 작성: 본인 명의로만, 그리고 볼 수 있는 대상에만
DROP POLICY IF EXISTS "Users can insert own book comments" ON public.book_comments;
CREATE POLICY "Users can insert own book comments"
  ON public.book_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      global_book_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = book_comments.book_id
          AND (b.is_public = true OR b.user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own book comments" ON public.book_comments;
CREATE POLICY "Users can update own book comments"
  ON public.book_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own book comments" ON public.book_comments;
CREATE POLICY "Users can delete own book comments"
  ON public.book_comments FOR DELETE USING (auth.uid() = user_id);

-- 좋아요: 집계는 공개, 쓰기는 본인 행만
DROP POLICY IF EXISTS "Anyone can view book record likes" ON public.book_record_likes;
CREATE POLICY "Anyone can view book record likes"
  ON public.book_record_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own book record likes" ON public.book_record_likes;
CREATE POLICY "Users can insert own book record likes"
  ON public.book_record_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own book record likes" ON public.book_record_likes;
CREATE POLICY "Users can delete own book record likes"
  ON public.book_record_likes FOR DELETE USING (auth.uid() = user_id);

-- 열람 시각: 남의 열람 시각을 볼 이유가 없다 → SELECT도 본인 행만
DROP POLICY IF EXISTS "Users manage own thread reads" ON public.book_thread_reads;
CREATE POLICY "Users manage own thread reads"
  ON public.book_thread_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 20260724000000_grant_public_privileges.sql 과 같은 방침: RLS가 행을 거르고,
-- 테이블 권한은 역할에 명시적으로 부여한다.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_comments     TO authenticated;
GRANT SELECT                        ON public.book_comments     TO anon;
GRANT SELECT, INSERT, DELETE        ON public.book_record_likes TO authenticated;
GRANT SELECT                        ON public.book_record_likes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_thread_reads TO authenticated;
```

- [ ] **Step 2: 로컬 Supabase를 켜고 마이그레이션 적용**

```bash
supabase start
supabase db reset
```

Expected: 에러 없이 전체 마이그레이션 재적용 완료.

- [ ] **Step 3: CHECK 제약이 실제로 막는지 psql로 확인**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
INSERT INTO book_comments (content) VALUES ('대상 없음');"
```

Expected: FAIL — `new row for relation "book_comments" violates check constraint "book_comments_one_target"`

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
INSERT INTO book_comments (book_id, global_book_id, content)
VALUES (gen_random_uuid(), gen_random_uuid(), '대상 둘');"
```

Expected: FAIL — 같은 제약 위반 (FK 위반보다 CHECK가 먼저 걸리거나, FK 위반이면 그것도 통과로 본다. 둘 다 거부되면 목적 달성)

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/20260725000003_create_book_comments.sql
git commit -m "feat(db): book_comments·book_record_likes·book_thread_reads 테이블과 RLS 추가"
```

---

### Task 2: 데이터 이관 마이그레이션 + 트리거

**Files:**
- Create: `supabase/migrations/20260725000004_migrate_comments_to_book.sql`

**Interfaces:**
- Consumes: Task 1의 세 테이블, 기존 `activity_comments` / `activity_likes` / `activities`
- Produces: 이관된 데이터 + 트리거 2개(`check_book_comment_depth_trigger`, `check_book_comment_parent_target_trigger`)

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 책 단위 댓글 재설계 ② 이관 + 트리거
--
-- id를 그대로 옮기는 것이 핵심이다. 그러면 parent_comment_id가 저절로 맞아떨어져
-- 매핑 테이블이 필요 없다.
--
-- 트리거를 여기(이관 뒤)에서 만드는 이유:
--   두 트리거 모두 부모 행을 조회한다. 그런데 아래 INSERT ... SELECT는 단일 문이고
--   트리거는 행 단위로 도는데, 같은 문에서 앞서 삽입된 행이 트리거의 조회에 보이는지가
--   보장되지 않는다. 부모가 안 보이면 '부모-대상 일치' 트리거는 오탐으로 이관을 막고,
--   '1depth' 트리거는 반대로 검사를 통과시켜 버린다.
--   이관 대상 데이터는 이미 activity_comments에서 두 규칙을 만족하므로 소급 검증이
--   필요 없다.
--
-- 원본 테이블은 삭제하지 않는다. 앱이 더 이상 읽지 않을 뿐이다(되돌릴 여지).
--
-- 작성일: 2026-07-25

-- =====================================================
-- 1. 댓글 이관
-- =====================================================
INSERT INTO public.book_comments (
  id, book_id, user_id, parent_comment_id, content, created_at, updated_at
)
SELECT ac.id, a.book_id, ac.user_id, ac.parent_comment_id,
       ac.content, ac.created_at, ac.updated_at
FROM public.activity_comments ac
JOIN public.activities a ON a.id = ac.activity_id
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. 좋아요 이관 (같은 책의 여러 활동에 눌렀으면 1개로 병합)
-- =====================================================
INSERT INTO public.book_record_likes (user_id, book_id, created_at)
SELECT al.user_id, a.book_id, MIN(al.created_at)
FROM public.activity_likes al
JOIN public.activities a ON a.id = al.activity_id
GROUP BY al.user_id, a.book_id
ON CONFLICT (user_id, book_id) DO NOTHING;

-- =====================================================
-- 3. 이관 검증 — 부모와 대상이 다른 행이 하나라도 있으면 마이그레이션을 중단한다
-- =====================================================
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.book_comments c
  JOIN public.book_comments p ON p.id = c.parent_comment_id
  WHERE c.book_id IS DISTINCT FROM p.book_id
     OR c.global_book_id IS DISTINCT FROM p.global_book_id;

  IF bad_count > 0 THEN
    RAISE EXCEPTION '이관 검증 실패: 부모와 대상이 다른 댓글 %건', bad_count;
  END IF;
END $$;

-- =====================================================
-- 4. 트리거 함수 + 트리거
-- =====================================================

-- 대댓글의 대댓글 금지 (1depth만 허용)
CREATE OR REPLACE FUNCTION public.check_book_comment_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.book_comments
      WHERE id = NEW.parent_comment_id
        AND parent_comment_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION '대댓글의 대댓글은 작성할 수 없습니다. (1depth만 허용)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 부모 댓글과 대상(책)이 같아야 한다 — A책 댓글이 B책 댓글의 답글이 되는 것을 막는다
CREATE OR REPLACE FUNCTION public.check_book_comment_parent_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_book UUID;
  parent_global_book UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT book_id, global_book_id INTO parent_book, parent_global_book
  FROM public.book_comments WHERE id = NEW.parent_comment_id;

  IF parent_book IS DISTINCT FROM NEW.book_id
     OR parent_global_book IS DISTINCT FROM NEW.global_book_id THEN
    RAISE EXCEPTION '부모 댓글과 다른 대상에는 답글을 달 수 없습니다.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_book_comment_depth_trigger ON public.book_comments;
CREATE TRIGGER check_book_comment_depth_trigger
  BEFORE INSERT OR UPDATE ON public.book_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_book_comment_depth();

DROP TRIGGER IF EXISTS check_book_comment_parent_target_trigger ON public.book_comments;
CREATE TRIGGER check_book_comment_parent_target_trigger
  BEFORE INSERT OR UPDATE ON public.book_comments
  FOR EACH ROW EXECUTE FUNCTION public.check_book_comment_parent_target();

-- 20260725000001_lock_down_function_privileges.sql 방침: 기본 실행 권한을 회수하고
-- 필요한 역할에만 부여한다. 트리거 함수는 테이블 소유자 권한으로 실행되므로
-- 클라이언트 역할에 EXECUTE를 줄 필요가 없다.
REVOKE ALL ON FUNCTION public.check_book_comment_depth()         FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_book_comment_parent_target() FROM PUBLIC;
```

- [ ] **Step 2: 리셋으로 전체 재적용**

```bash
supabase db reset
```

Expected: 에러 없이 완료. (로컬 DB는 데이터가 비어 있어 이관 건수는 0일 수 있다 — 정상)

- [ ] **Step 3: 시드 데이터를 넣고 이관 로직을 실제로 검증**

로컬 DB가 비어 있으면 이관이 검증되지 않는다. 임시 데이터를 넣고 두 번째 이관을 흉내 낸다.

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
-- 임시 사용자 · 책 · 활동 2개 · 댓글 2개(부모/자식) · 좋아요 2개(같은 책 다른 활동)
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 't@t.io');
INSERT INTO books (id, user_id, isbn, title, status)
VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','X','책','reading');
INSERT INTO activities (id, user_id, book_id, activity_type) VALUES
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','book_added'),
  ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','book_completed');
INSERT INTO activity_comments (id, activity_id, user_id, content) VALUES
  ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','부모');
INSERT INTO activity_comments (id, activity_id, user_id, parent_comment_id, content) VALUES
  ('66666666-6666-6666-6666-666666666666','33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','자식');
INSERT INTO activity_likes (activity_id, user_id) VALUES
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111');

-- 이관 재실행 (마이그레이션의 1·2번 블록과 동일)
INSERT INTO book_comments (id, book_id, user_id, parent_comment_id, content, created_at, updated_at)
SELECT ac.id, a.book_id, ac.user_id, ac.parent_comment_id, ac.content, ac.created_at, ac.updated_at
FROM activity_comments ac JOIN activities a ON a.id = ac.activity_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO book_record_likes (user_id, book_id, created_at)
SELECT al.user_id, a.book_id, MIN(al.created_at)
FROM activity_likes al JOIN activities a ON a.id = al.activity_id
GROUP BY al.user_id, a.book_id
ON CONFLICT (user_id, book_id) DO NOTHING;

SELECT '댓글 이관 건수' AS 항목, count(*) AS 값 FROM book_comments
UNION ALL SELECT '부모관계 보존', count(*) FROM book_comments WHERE parent_comment_id IS NOT NULL
UNION ALL SELECT '좋아요 병합 건수', count(*) FROM book_record_likes;
ROLLBACK;
SQL
```

Expected:
```
 댓글 이관 건수   | 2
 부모관계 보존    | 1
 좋아요 병합 건수 | 1     ← 활동 2개에 눌렀지만 책 기준 1행으로 병합
```

- [ ] **Step 4: 트리거 2개가 실제로 막는지 확인**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" <<'SQL'
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 't@t.io');
INSERT INTO books (id, user_id, isbn, title, status) VALUES
  ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','X','책A','reading'),
  ('77777777-7777-7777-7777-777777777777','11111111-1111-1111-1111-111111111111','Y','책B','reading');
INSERT INTO book_comments (id, book_id, user_id, content)
VALUES ('88888888-8888-8888-8888-888888888888','22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','부모');
-- 다른 책에 답글 → 거부되어야 한다
INSERT INTO book_comments (book_id, user_id, parent_comment_id, content)
VALUES ('77777777-7777-7777-7777-777777777777','11111111-1111-1111-1111-111111111111','88888888-8888-8888-8888-888888888888','다른 책 답글');
ROLLBACK;
SQL
```

Expected: FAIL — `부모 댓글과 다른 대상에는 답글을 달 수 없습니다.`

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260725000004_migrate_comments_to_book.sql
git commit -m "feat(db): activity 댓글·좋아요를 책 단위로 이관하고 무결성 트리거 추가"
```

---

### Task 3: 댓글 계층 구조 빌드 (순수 함수)

**Files:**
- Create: `apps/page0127/app/api/_helpers/bookComments.ts`
- Test: `apps/page0127/app/api/_helpers/bookComments.test.ts`

**Interfaces:**
- Produces:
  - `type CommentTargetColumn = { book_id: string } | { global_book_id: string }`
  - `type CommentRow = { id, user_id, parent_comment_id, content, created_at, updated_at }`
  - `type ProfileRow = { id, nickname, username, photo_url }`
  - `type CommentUser = { id: string; nickname: string | null; photoUrl: string | null }`
  - `type CommentNode = { id, userId, parentCommentId, content, createdAt, updatedAt, user, replies }`
  - `buildCommentTree(rows: CommentRow[], profiles: ProfileRow[]): CommentNode[]`
- Task 4·5·7이 이 타입과 함수를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// apps/page0127/app/api/_helpers/bookComments.test.ts
import { describe, expect, it } from 'vitest';

import { buildCommentTree } from './bookComments';

const profiles = [
  { id: 'u1', nickname: '경민', username: 'kyungmin', photo_url: null },
  { id: 'u2', nickname: null, username: 'jieun', photo_url: 'p.png' },
];

const row = (over: Partial<Parameters<typeof buildCommentTree>[0][number]>) => ({
  id: 'c1',
  user_id: 'u1',
  parent_comment_id: null,
  content: '내용',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  ...over,
});

describe('buildCommentTree', () => {
  it('부모 댓글 아래에 대댓글을 중첩한다', () => {
    const result = buildCommentTree(
      [
        row({ id: 'c1' }),
        row({ id: 'c2', parent_comment_id: 'c1', content: '답글' }),
      ],
      profiles
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
    expect(result[0].replies.map((r) => r.id)).toEqual(['c2']);
  });

  it('닉네임이 없으면 username으로 대체한다', () => {
    const result = buildCommentTree([row({ id: 'c1', user_id: 'u2' })], profiles);

    expect(result[0].user).toEqual({
      id: 'u2',
      nickname: 'jieun',
      photoUrl: 'p.png',
    });
  });

  it('탈퇴한 사용자(user_id=null)는 user를 null로 둔다', () => {
    const result = buildCommentTree([row({ id: 'c1', user_id: null })], profiles);

    expect(result[0].userId).toBeNull();
    expect(result[0].user).toBeNull();
  });

  it('부모가 목록에 없는 대댓글은 버리지 않고 루트로 올린다', () => {
    const result = buildCommentTree(
      [row({ id: 'c2', parent_comment_id: 'missing' })],
      profiles
    );

    expect(result.map((c) => c.id)).toEqual(['c2']);
  });

  it('created_at 오름차순으로 정렬한다', () => {
    const result = buildCommentTree(
      [
        row({ id: 'late', created_at: '2026-07-05T00:00:00Z' }),
        row({ id: 'early', created_at: '2026-07-01T00:00:00Z' }),
      ],
      profiles
    );

    expect(result.map((c) => c.id)).toEqual(['early', 'late']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/bookComments.test.ts`
Expected: FAIL — `Failed to resolve import "./bookComments"`

- [ ] **Step 3: 구현**

```ts
// apps/page0127/app/api/_helpers/bookComments.ts

/**
 * 책 단위 댓글 공용 로직
 *
 * 학습 포인트:
 * - 라우트(개인 책 / 전역 책)는 대상 컬럼만 다르고 나머지가 같다.
 *   판단 로직을 순수 함수로 빼두면 라우트는 얇아지고 테스트는 DB 없이 돈다.
 */

export type CommentRow = {
  id: string;
  user_id: string | null;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  nickname: string | null;
  username: string | null;
  photo_url: string | null;
};

export type CommentUser = {
  id: string;
  nickname: string | null;
  photoUrl: string | null;
};

export type CommentNode = {
  id: string;
  userId: string | null;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser | null;
  replies: CommentNode[];
};

/** 대상 컬럼 — 라우트가 어느 쪽 책인지 정해서 넘긴다 */
export type CommentTargetColumn =
  | { book_id: string }
  | { global_book_id: string };

const toUser = (
  userId: string | null,
  profiles: Map<string, ProfileRow>
): CommentUser | null => {
  if (!userId) return null; // 탈퇴한 사용자
  const profile = profiles.get(userId);
  return {
    id: userId,
    // 닉네임 미설정 시 username으로 대체 (익명 방지)
    nickname: profile?.nickname || profile?.username || null,
    photoUrl: profile?.photo_url || null,
  };
};

const byCreatedAt = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt);

export function buildCommentTree(
  rows: CommentRow[],
  profiles: ProfileRow[]
): CommentNode[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const nodes = rows.map<CommentNode>((row) => ({
    id: row.id,
    userId: row.user_id,
    parentCommentId: row.parent_comment_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: toUser(row.user_id, profileMap),
    replies: [],
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots: CommentNode[] = [];

  for (const node of nodes) {
    const parent = node.parentCommentId
      ? nodeMap.get(node.parentCommentId)
      : undefined;

    // 부모가 목록에 없으면(권한으로 잘렸거나 삭제됨) 버리지 않고 루트로 올린다.
    // 대댓글이 통째로 사라지는 것보다 낫다.
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  roots.sort(byCreatedAt);
  for (const root of roots) root.replies.sort(byCreatedAt);

  return roots;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/bookComments.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add apps/page0127/app/api/_helpers/bookComments.ts apps/page0127/app/api/_helpers/bookComments.test.ts
git commit -m "feat(api): 책 댓글 계층 구조 빌드 순수 함수 추가"
```

---

### Task 4: 개인 책 댓글 목록·작성 API

**Files:**
- Create: `apps/page0127/app/api/books/[id]/comments/route.ts`

**Interfaces:**
- Consumes: `buildCommentTree`, `CommentRow`, `ProfileRow` (Task 3), `getCurrentUser`/`getSupabaseClient`/`successResponse`/`errorResponse` (기존 헬퍼)
- Produces: `GET /api/books/[id]/comments` → `CommentNode[]`, `POST` → 생성된 `CommentNode` (201)

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/books/[id]/comments/route.ts
import { NextRequest } from 'next/server';

import { buildCommentTree } from '../../../_helpers/bookComments';
import { getCurrentUser, getSupabaseClient } from '../../../_helpers/auth';
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
    ...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)),
  ];
  if (userIds.length === 0) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, username, photo_url')
    .in('id', userIds);

  return data ?? [];
};

/**
 * GET /api/books/[id]/comments
 * 개인 서재 책 스레드의 댓글 목록
 *
 * 학습 포인트:
 * - 권한 판단을 앱에서 하지 않는다. RLS가 "볼 수 있는 책의 댓글"만 돌려주므로
 *   비공개 책이면 빈 배열이 온다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;

    const { data: rows, error } = await supabase
      .from('book_comments')
      .select(COMMENT_COLUMNS)
      .eq('book_id', id)
      .order('created_at', { ascending: true });

    if (error) return errorResponse(error.message);
    if (!rows || rows.length === 0) return successResponse([]);

    const profiles = await fetchProfiles(supabase, rows);
    return successResponse(buildCommentTree(rows, profiles));
  } catch (error) {
    console.error('책 댓글 조회 에러:', error);
    return errorResponse('댓글 조회에 실패했습니다.');
  }
}

/**
 * POST /api/books/[id]/comments
 * 개인 서재 책 스레드에 댓글 작성
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .insert({
        book_id: id,
        user_id: user!.id,
        parent_comment_id: parentCommentId || null,
        content: content.trim(),
      })
      .select(COMMENT_COLUMNS)
      .single();

    if (error) {
      if (error.message.includes('1depth')) {
        return errorResponse('대댓글의 대댓글은 작성할 수 없습니다.', 400);
      }
      if (error.message.includes('다른 대상')) {
        return errorResponse('잘못된 답글 대상입니다.', 400);
      }
      return errorResponse(error.message);
    }

    const profiles = await fetchProfiles(supabase, [comment]);
    const [node] = buildCommentTree([comment], profiles);

    // 알림 — 책 소유자에게 (본인 책에 단 경우 제외)
    const { data: book } = await supabase
      .from('books')
      .select('user_id')
      .eq('id', id)
      .single();

    if (book && book.user_id !== user!.id) {
      await supabase.from('notifications').insert({
        user_id: book.user_id,
        type: 'comment',
        actor_id: user!.id,
        target_id: id,
        target_type: 'book',
      });
    }

    // 대댓글이면 부모 댓글 작성자에게도 (중복·자기 자신 제외)
    if (parentCommentId) {
      const { data: parent } = await supabase
        .from('book_comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single();

      if (
        parent?.user_id &&
        parent.user_id !== user!.id &&
        parent.user_id !== book?.user_id
      ) {
        await supabase.from('notifications').insert({
          user_id: parent.user_id,
          type: 'comment',
          actor_id: user!.id,
          target_id: id,
          target_type: 'book',
        });
      }
    }

    return successResponse(node, 201);
  } catch (error) {
    console.error('책 댓글 작성 에러:', error);
    return errorResponse('댓글 작성에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: 로컬에서 실제 호출 확인**

`npm run dev:local`로 앱을 띄우고 로그인한 뒤, 브라우저 콘솔에서:

```js
await fetch('/api/books/<본인_책_id>/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '첫 댓글' }),
}).then((r) => r.json());
```

Expected: `201`과 함께 `{ id, content: '첫 댓글', user: {...}, replies: [] }`

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/app/api/books
git commit -m "feat(api): 책 단위 댓글 목록·작성 API 추가"
```

---

### Task 5: 댓글 수정·삭제 API

**Files:**
- Create: `apps/page0127/app/api/books/[id]/comments/[commentId]/route.ts`

**Interfaces:**
- Consumes: Task 3의 `buildCommentTree`
- Produces: `PATCH` → 수정된 `CommentNode`, `DELETE` → `{ success: true }`

- [ ] **Step 1: 라우트 구현**

```ts
// apps/page0127/app/api/books/[id]/comments/[commentId]/route.ts
import { NextRequest } from 'next/server';

import { buildCommentTree } from '../../../../_helpers/bookComments';
import { getCurrentUser, getSupabaseClient } from '../../../../_helpers/auth';
import { errorResponse, successResponse } from '../../../../_helpers/response';

type Params = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COLUMNS =
  'id, user_id, parent_comment_id, content, created_at, updated_at';

/**
 * PATCH /api/books/[id]/comments/[commentId]
 *
 * 학습 포인트:
 * - 작성자 확인을 앱에서 다시 하지 않는다. RLS UPDATE 정책이 본인 행만 허용하므로
 *   남의 댓글을 고치려 하면 0행이 갱신되고, .single()이 에러를 낸다.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { content } = await request.json();
    if (!content || content.trim().length === 0) {
      return errorResponse('댓글 내용을 입력해주세요.', 400);
    }

    const { data: comment, error } = await supabase
      .from('book_comments')
      .update({ content: content.trim() })
      .eq('id', commentId)
      .eq('book_id', id)
      .select(COMMENT_COLUMNS)
      .single();

    if (error) return errorResponse('댓글을 수정할 권한이 없습니다.', 403);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname, username, photo_url')
      .in('id', comment.user_id ? [comment.user_id] : []);

    const [node] = buildCommentTree([comment], profiles ?? []);
    return successResponse(node);
  } catch (error) {
    console.error('책 댓글 수정 에러:', error);
    return errorResponse('댓글 수정에 실패했습니다.');
  }
}

/**
 * DELETE /api/books/[id]/comments/[commentId]
 * 대댓글은 FK ON DELETE CASCADE로 함께 지워진다.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id, commentId } = await params;
    const { error: authError } = await getCurrentUser();
    if (authError) return authError;

    const { error, count } = await supabase
      .from('book_comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('book_id', id);

    if (error) return errorResponse(error.message);
    if (!count) return errorResponse('댓글을 삭제할 권한이 없습니다.', 403);

    return successResponse({ success: true });
  } catch (error) {
    console.error('책 댓글 삭제 에러:', error);
    return errorResponse('댓글 삭제에 실패했습니다.');
  }
}
```

- [ ] **Step 2: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add apps/page0127/app/api/books/\[id\]/comments/\[commentId\]/route.ts
git commit -m "feat(api): 책 단위 댓글 수정·삭제 API 추가"
```

---

### Task 6: 알림 라우팅에 `book` 분기 추가

**Files:**
- Modify: `apps/page0127/src/features/notification/ui/NotificationList.tsx:125`
- Modify: `apps/page0127/src/features/notification/ui/NotificationPage.tsx:114`

**Interfaces:**
- Consumes: Task 4가 만드는 `target_type: 'book'` 알림
- Produces: 없음 (UI 동작 변경)

Task 4부터 `target_type: 'book'` 알림이 쌓이는데, 라우팅이 없으면 `/feed/{book_id}`로 가서 깨진다. 그래서 바로 이어서 고친다.

- [ ] **Step 1: 두 파일의 클릭 핸들러에 분기 추가**

각 파일에서 아래 부분을 찾는다:

```tsx
    } else if (notification.target_id) {
      router.push(`/feed/${notification.target_id}`);
```

다음으로 바꾼다:

```tsx
      // 책 스레드 알림 — 소유자든 방문자든 내 서재 경로로 보내면
      // 소유자가 아닐 때 404가 나므로, 공개 상세 경로로 보낸다.
    } else if (notification.target_type === 'book' && notification.target_id) {
      router.push(`/books/${notification.target_id}`);
      // 기존 활동 알림은 그대로 둔다 — 과거 알림이 깨지면 안 된다
    } else if (notification.target_id) {
      router.push(`/feed/${notification.target_id}`);
```

- [ ] **Step 2: `NotificationTargetType`에 `'book'` 추가**

`src/entities/notification/model/types.ts:19`을 바꾼다.

```diff
- export type NotificationTargetType = 'activity' | 'comment';
+ export type NotificationTargetType = 'activity' | 'comment' | 'book';
```

바로 위 주석 블록(16~18행)에도 한 줄 더한다.

```diff
   * - comment: 댓글
+  * - book: 책 스레드 (책 단위 댓글)
   */
```

- [ ] **Step 3: 타입 검사**

Run: `cd apps/page0127 && npm run type-check`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/features/notification apps/page0127/src/entities/notification
git commit -m "feat(notification): 책 스레드 댓글 알림 라우팅 추가"
```

---

### Task 7: 스트림 병합 (순수 함수) + 스트림 API

**Files:**
- Create: `apps/page0127/app/api/_helpers/bookStream.ts`
- Test: `apps/page0127/app/api/_helpers/bookStream.test.ts`
- Create: `apps/page0127/app/api/books/[id]/stream/route.ts`

**Interfaces:**
- Consumes: `CommentNode` (Task 3)
- Produces:
  - `type StreamActivity = { kind: 'activity'; id: string; activityType: 'book_added' | 'book_completed' | 'review_added'; content: string | null; createdAt: string }`
  - `type StreamComment = CommentNode & { kind: 'comment' }`
  - `type StreamItem = StreamActivity | StreamComment`
  - `mergeStreamItems(activities: StreamActivity[], comments: CommentNode[]): StreamItem[]`
  - `GET /api/books/[id]/stream` → `{ items: StreamItem[]; hasMore: boolean }`
- Task 10의 `BookStreamSection`이 이 응답을 렌더한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// apps/page0127/app/api/_helpers/bookStream.test.ts
import { describe, expect, it } from 'vitest';

import { mergeStreamItems } from './bookStream';

import type { CommentNode } from './bookComments';
import type { StreamActivity } from './bookStream';

const activity = (id: string, createdAt: string): StreamActivity => ({
  kind: 'activity',
  id,
  activityType: 'book_added',
  content: null,
  createdAt,
});

const comment = (id: string, createdAt: string): CommentNode => ({
  id,
  userId: 'u1',
  parentCommentId: null,
  content: '댓글',
  createdAt,
  updatedAt: createdAt,
  user: { id: 'u1', nickname: '경민', photoUrl: null },
  replies: [],
});

describe('mergeStreamItems', () => {
  it('활동과 댓글을 created_at 오름차순으로 섞는다', () => {
    const result = mergeStreamItems(
      [activity('a1', '2026-07-01T00:00:00Z'), activity('a2', '2026-07-20T00:00:00Z')],
      [comment('c1', '2026-07-10T00:00:00Z'), comment('c2', '2026-07-25T00:00:00Z')]
    );

    expect(result.map((i) => i.id)).toEqual(['a1', 'c1', 'a2', 'c2']);
  });

  it('시각이 같으면 활동을 먼저 놓는다', () => {
    const same = '2026-07-01T00:00:00Z';
    const result = mergeStreamItems([activity('a1', same)], [comment('c1', same)]);

    expect(result.map((i) => i.id)).toEqual(['a1', 'c1']);
  });

  it('댓글에 kind를 붙이고 대댓글은 중첩된 채로 둔다', () => {
    const parent = comment('c1', '2026-07-01T00:00:00Z');
    parent.replies = [comment('c2', '2026-07-02T00:00:00Z')];

    const result = mergeStreamItems([], [parent]);

    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('comment');
    expect(result[0].kind === 'comment' && result[0].replies).toHaveLength(1);
  });

  it('양쪽이 비면 빈 배열', () => {
    expect(mergeStreamItems([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/bookStream.test.ts`
Expected: FAIL — `Failed to resolve import "./bookStream"`

- [ ] **Step 3: 구현**

```ts
// apps/page0127/app/api/_helpers/bookStream.ts
import type { CommentNode } from './bookComments';

/**
 * 책 스트림 — 활동(상태 변화)과 댓글을 한 줄기로 병합한다
 *
 * 학습 포인트:
 * - 상태 변화는 따로 저장하지 않는다. activities에 이미 있는 것을 읽어 섞을 뿐이다.
 * - kind로 구분하는 구별 유니온(discriminated union) — 렌더 쪽에서 switch로 좁힌다.
 */

export type StreamActivity = {
  kind: 'activity';
  id: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
};

export type StreamComment = CommentNode & { kind: 'comment' };

export type StreamItem = StreamActivity | StreamComment;

export function mergeStreamItems(
  activities: StreamActivity[],
  comments: CommentNode[]
): StreamItem[] {
  const commentItems: StreamComment[] = comments.map((c) => ({
    ...c,
    kind: 'comment',
  }));

  return [...activities, ...commentItems].sort((a, b) => {
    const diff = a.createdAt.localeCompare(b.createdAt);
    if (diff !== 0) return diff;
    // 같은 시각이면 활동을 먼저 — "완독했어요" 아래에 그에 대한 댓글이 오는 게 자연스럽다
    if (a.kind === b.kind) return 0;
    return a.kind === 'activity' ? -1 : 1;
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/page0127 && npx vitest run app/api/_helpers/bookStream.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 스트림 라우트 구현**

```ts
// apps/page0127/app/api/books/[id]/stream/route.ts
import { NextRequest } from 'next/server';

import { buildCommentTree } from '../../../_helpers/bookComments';
import { getSupabaseClient } from '../../../_helpers/auth';
import { mergeStreamItems } from '../../../_helpers/bookStream';
import { errorResponse, successResponse } from '../../../_helpers/response';

import type { CommentRow, ProfileRow } from '../../../_helpers/bookComments';
import type { StreamActivity } from '../../../_helpers/bookStream';

type Params = {
  params: Promise<{ id: string }>;
};

// 한 책의 댓글이 이보다 많으면 "이전 댓글 더보기"로 끊는다.
// 활동은 한 책당 보통 3~10개라 전부 싣는다.
const COMMENT_PAGE_SIZE = 50;

/**
 * GET /api/books/[id]/stream?before=<ISO>
 * 책 스트림 — 활동(상태 변화)과 댓글을 시간순으로 병합해 돌려준다
 *
 * 학습 포인트:
 * - before 커서: 오래된 댓글을 더 불러올 때 쓴다(offset보다 안정적 — 그 사이 새
 *   댓글이 달려도 이미 본 항목이 밀려 중복되지 않는다).
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const supabase = await getSupabaseClient();
    const { id } = await params;
    const before = request.nextUrl.searchParams.get('before');

    let commentQuery = supabase
      .from('book_comments')
      .select('id, user_id, parent_comment_id, content, created_at, updated_at')
      .eq('book_id', id)
      .order('created_at', { ascending: false })
      .limit(COMMENT_PAGE_SIZE + 1); // 하나 더 받아 hasMore를 판정한다

    if (before) commentQuery = commentQuery.lt('created_at', before);

    const [{ data: activities, error: activityError }, { data: commentRows, error: commentError }] =
      await Promise.all([
        supabase
          .from('activities')
          .select('id, activity_type, content, created_at')
          .eq('book_id', id)
          .order('created_at', { ascending: true }),
        commentQuery,
      ]);

    if (activityError) return errorResponse(activityError.message);
    if (commentError) return errorResponse(commentError.message);

    const rows = (commentRows ?? []) as CommentRow[];
    const hasMore = rows.length > COMMENT_PAGE_SIZE;
    const pageRows = hasMore ? rows.slice(0, COMMENT_PAGE_SIZE) : rows;

    const userIds = [
      ...new Set(pageRows.map((r) => r.user_id).filter((v): v is string => !!v)),
    ];
    const { data: profiles } =
      userIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, nickname, username, photo_url')
            .in('id', userIds)
        : { data: [] as ProfileRow[] };

    const streamActivities: StreamActivity[] = (activities ?? []).map((a) => ({
      kind: 'activity',
      id: a.id,
      activityType: a.activity_type,
      content: a.content,
      createdAt: a.created_at,
    }));

    const items = mergeStreamItems(
      streamActivities,
      buildCommentTree(pageRows, profiles ?? [])
    );

    return successResponse({ items, hasMore });
  } catch (error) {
    console.error('책 스트림 조회 에러:', error);
    return errorResponse('스트림 조회에 실패했습니다.');
  }
}
```

- [ ] **Step 6: 타입 검사·린트·전체 테스트**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add apps/page0127/app/api/_helpers/bookStream.ts apps/page0127/app/api/_helpers/bookStream.test.ts apps/page0127/app/api/books/\[id\]/stream/route.ts
git commit -m "feat(api): 활동·댓글 병합 스트림 API 추가"
```

---

### Task 8: `entities/comment`를 대상 축으로 전환

**Files:**
- Modify: `apps/page0127/src/shared/config/endpoints.ts`
- Modify: `apps/page0127/src/entities/comment/types.ts`
- Modify: `apps/page0127/src/entities/comment/api.ts`
- Modify: `apps/page0127/src/entities/comment/model/queryKeys.ts`

**Interfaces:**
- Produces:
  - `type CommentTarget = { type: 'book'; id: string } | { type: 'globalBook'; id: string }`
  - `commentApi.getComments(target)` / `.createComment(target, req)` / `.updateComment(target, commentId, req)` / `.deleteComment(target, commentId)`
  - `commentKeys.byTarget(target)`
- Task 9·10이 이것들을 사용한다. 전역 책(`globalBook`) 분기는 계획 3에서 라우트가 생기기 전까지 호출되지 않지만, 타입과 엔드포인트는 지금 만들어둔다.

- [ ] **Step 1: 엔드포인트 추가**

`src/shared/config/endpoints.ts`의 `books` 블록에 추가하고, `globalBooks` 블록을 새로 만든다.

```ts
  books: {
    // ...기존 유지...
    comments: (bookId: string) => `/books/${bookId}/comments`, // GET/POST
    commentDetail: (bookId: string, commentId: string) =>
      `/books/${bookId}/comments/${commentId}`, // PATCH/DELETE
    stream: (bookId: string) => `/books/${bookId}/stream`, // GET: 활동+댓글 병합
  },
  globalBooks: {
    comments: (id: string) => `/global-books/${id}/comments`,
    commentDetail: (id: string, commentId: string) =>
      `/global-books/${id}/comments/${commentId}`,
  },
```

- [ ] **Step 2: 타입 교체**

`src/entities/comment/types.ts`에서 `Comment`의 `activityId`를 지우고 대상 타입을 넣는다.

```ts
/**
 * 댓글이 붙는 대상
 *
 * 학습 포인트:
 * - 댓글은 활동이 아니라 책에 붙는다. 개인 서재 책과 전역 책 두 종류가 있어
 *   구별 유니온으로 표현한다.
 */
export type CommentTarget =
  | { type: 'book'; id: string }
  | { type: 'globalBook'; id: string };

export type Comment = {
  id: string;
  userId: string | null; // 탈퇴한 사용자의 경우 null
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    nickname: string | null;
    photoUrl: string | null;
  } | null;
  replies?: Comment[];
};
```

`CreateCommentRequest` / `UpdateCommentRequest`는 그대로 둔다.

- [ ] **Step 3: API 클라이언트 교체**

```ts
// apps/page0127/src/entities/comment/api.ts
import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import {
  Comment,
  CommentTarget,
  CreateCommentRequest,
  UpdateCommentRequest,
} from './types';

/**
 * 댓글 API 클라이언트
 *
 * 학습 포인트:
 * - 대상(개인 책 / 전역 책)에 따라 엔드포인트만 갈라지고 나머지는 같다.
 *   분기를 한 곳(resolve)에 모아 호출부는 대상만 넘기게 한다.
 */

const resolve = {
  list: (target: CommentTarget) =>
    target.type === 'book'
      ? API_ENDPOINTS.books.comments(target.id)
      : API_ENDPOINTS.globalBooks.comments(target.id),
  detail: (target: CommentTarget, commentId: string) =>
    target.type === 'book'
      ? API_ENDPOINTS.books.commentDetail(target.id, commentId)
      : API_ENDPOINTS.globalBooks.commentDetail(target.id, commentId),
};

export const commentApi = {
  getComments: async (target: CommentTarget): Promise<Comment[]> => {
    const { data } = await apiClient.get<Comment[]>(resolve.list(target));
    return data ?? [];
  },

  createComment: async (
    target: CommentTarget,
    request: CreateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.post<Comment>(resolve.list(target), request);
    return data;
  },

  updateComment: async (
    target: CommentTarget,
    commentId: string,
    request: UpdateCommentRequest
  ): Promise<Comment> => {
    const { data } = await apiClient.patch<Comment>(
      resolve.detail(target, commentId),
      request
    );
    return data;
  },

  deleteComment: async (
    target: CommentTarget,
    commentId: string
  ): Promise<void> => {
    await apiClient.delete(resolve.detail(target, commentId));
  },
};
```

- [ ] **Step 4: 쿼리 키 교체**

```ts
// apps/page0127/src/entities/comment/model/queryKeys.ts
import type { CommentTarget } from '../types';

/**
 * Comment 엔티티 Query Keys
 *
 * 학습 포인트:
 * - 키에 대상 종류를 포함시켜, 같은 UUID라도 개인 책과 전역 책 캐시가 섞이지 않게 한다.
 */
export const commentKeys = {
  all: ['comments'] as const,

  byTarget: (target: CommentTarget) =>
    [...commentKeys.all, target.type, target.id] as const,

  details: () => [...commentKeys.all, 'detail'] as const,
  detail: (id: string) => [...commentKeys.details(), id] as const,
} as const;
```

- [ ] **Step 5: 타입 검사로 깨진 호출부 확인**

Run: `cd apps/page0127 && npm run type-check`
Expected: FAIL — `features/comment` 4개 파일에서 `activityId` 관련 에러. Task 9에서 고친다.

- [ ] **Step 6: 커밋** (타입 에러가 남아 있으므로 Task 9와 이어서 진행한다)

```bash
git add apps/page0127/src/entities/comment apps/page0127/src/shared/config/endpoints.ts
git commit -m "refactor(comment): 댓글 엔티티를 활동 축에서 책 대상 축으로 전환"
```

---

### Task 9: `features/comment` UI를 `target` prop으로 전환

**Files:**
- Modify: `apps/page0127/src/features/comment/ui/CommentSection.tsx`
- Modify: `apps/page0127/src/features/comment/ui/CommentForm.tsx`
- Modify: `apps/page0127/src/features/comment/ui/CommentList.tsx`
- Modify: `apps/page0127/src/features/comment/ui/CommentItem.tsx`
- Modify: `apps/page0127/src/widgets/activity/ui/ActivityCard.tsx`

**Interfaces:**
- Consumes: `CommentTarget`, `commentApi`, `commentKeys` (Task 8)
- Produces: `<CommentSection target={...} initialOpen? />`, `<CommentList target={...} />`, `<CommentForm target={...} parentCommentId? ... />`, `<CommentItem comment={...} target={...} isReply? />`

- [ ] **Step 1: 네 컴포넌트의 prop 치환**

각 파일에서 기계적으로 바꾼다:

- `type ...Props`의 `activityId: string` → `target: CommentTarget`
- 구조 분해 `({ activityId, ... })` → `({ target, ... })`
- `commentKeys.byActivity(activityId)` → `commentKeys.byTarget(target)`
- `commentApi.getComments(activityId)` → `commentApi.getComments(target)`
- `commentApi.createComment(activityId, {...})` → `commentApi.createComment(target, {...})`
- `commentApi.updateComment(activityId, comment.id, {...})` → `commentApi.updateComment(target, comment.id, {...})`
- `commentApi.deleteComment(activityId, comment.id)` → `commentApi.deleteComment(target, comment.id)`
- 자식에 넘기는 `activityId={activityId}` → `target={target}`
- `import type { CommentTarget } from '@/entities/comment';` 추가 (기존 `@/entities/comment` import 줄에 합쳐도 된다)

`CommentSection.tsx`의 타입은 이렇게 된다:

```tsx
type CommentSectionProps = {
  target: CommentTarget;
  initialOpen?: boolean; // 초기 펼침 상태
};
```

`CommentItem.tsx`는 이렇게 된다:

```tsx
type CommentItemProps = {
  comment: Comment;
  target: CommentTarget;
  isReply?: boolean;
};
```

- [ ] **Step 2: `ActivityCard`의 호출부 수정**

`src/widgets/activity/ui/ActivityCard.tsx`에서:

```diff
-        <CommentSection
-          activityId={activity.id}
-          initialOpen={initialCommentsOpen}
-        />
+        <CommentSection
+          target={{ type: 'book', id: activity.book.id }}
+          initialOpen={initialCommentsOpen}
+        />
```

`activity.book`은 이 컴포넌트 첫 줄(`if (!activity.book) return null;`)에서 이미 좁혀져 있다.

- [ ] **Step 3: 타입 검사·린트**

Run: `cd apps/page0127 && npm run type-check && npm run lint`
Expected: PASS — Task 8에서 남은 에러가 모두 사라진다

- [ ] **Step 4: 커밋**

```bash
git add apps/page0127/src/features/comment apps/page0127/src/widgets/activity/ui/ActivityCard.tsx
git commit -m "refactor(comment): 댓글 UI를 activityId 대신 target prop으로 전환"
```

---

### Task 10: 책 상세 통합 스트림 섹션

**Files:**
- Create: `apps/page0127/src/widgets/book/ui/BookStreamEvent.tsx`
- Create: `apps/page0127/src/widgets/book/ui/BookStreamSection.tsx`
- Modify: `apps/page0127/src/widgets/book/ui/BookDetailContent.tsx:8,168`
- Delete: `apps/page0127/src/widgets/book/ui/BookActivitySection.tsx`

**Interfaces:**
- Consumes: `GET /api/books/[id]/stream` (Task 7), `CommentForm`·`CommentItem` (Task 9)
- Produces: `<BookStreamSection bookId={...} />`

- [ ] **Step 1: 상태 변화 마커 컴포넌트**

```tsx
// apps/page0127/src/widgets/book/ui/BookStreamEvent.tsx
import { Star } from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

type BookStreamEventProps = {
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
  rating?: number | null;
};

const EVENT_TEXT: Record<BookStreamEventProps['activityType'], string> = {
  book_added: '책장에 담았어요',
  book_completed: '완독했어요',
  review_added: '리뷰를 남겼어요',
};

/**
 * 스트림 중간에 놓이는 상태 변화 한 줄
 *
 * 학습 포인트:
 * - 댓글과 시각적으로 구분되어야 하되 카드가 되어선 안 된다. 대화의 흐름을 끊지 않도록
 *   점 + 옅은 글씨의 얇은 줄로 둔다.
 */
export const BookStreamEvent = ({
  activityType,
  content,
  createdAt,
  rating,
}: BookStreamEventProps) => (
  <div className='py-2'>
    <p className='flex items-center gap-2 text-sm text-text-subtle'>
      <span aria-hidden='true' className='size-1.5 rounded-full bg-line' />
      <RelativeTime date={createdAt} className='text-text-faint' />
      <span>{EVENT_TEXT[activityType]}</span>
      {activityType === 'book_completed' && rating ? (
        <span className='flex items-center gap-1 text-text-body'>
          <Star aria-hidden='true' className='size-3.5 fill-chart-4 text-chart-4' />
          {rating}
        </span>
      ) : null}
    </p>

    {activityType === 'review_added' && content && (
      <p className='mt-1 pl-4 text-[15px] leading-7 text-text-body'>{content}</p>
    )}
  </div>
);
```

- [ ] **Step 2: 스트림 섹션 컴포넌트**

```tsx
// apps/page0127/src/widgets/book/ui/BookStreamSection.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import { CommentTarget, commentKeys } from '@/entities/comment';
import { useCurrentUserContext } from '@/entities/user';

import { CommentForm, CommentItem } from '@/features/comment';

import { BookStreamEvent } from './BookStreamEvent';

import type { Comment } from '@/entities/comment';

type StreamActivity = {
  kind: 'activity';
  id: string;
  activityType: 'book_added' | 'book_completed' | 'review_added';
  content: string | null;
  createdAt: string;
};

type StreamComment = Comment & { kind: 'comment' };

type StreamItem = StreamActivity | StreamComment;

type BookStreamSectionProps = {
  bookId: string;
  rating?: number | null;
};

/**
 * 책 상세의 "이 책의 기록" — 상태 변화와 댓글이 시간순으로 섞인 하나의 줄기
 *
 * 학습 포인트:
 * - 스트림 쿼리와 댓글 쿼리가 같은 데이터를 본다. 댓글을 쓰면 CommentForm이
 *   commentKeys.byTarget을 무효화하므로, 여기서도 같은 키를 쿼리 키에 포함시켜
 *   한 번의 무효화로 둘 다 갱신되게 한다.
 */
export const BookStreamSection = ({ bookId, rating }: BookStreamSectionProps) => {
  const { currentUser } = useCurrentUserContext();
  const target: CommentTarget = { type: 'book', id: bookId };

  const { data, isLoading } = useQuery({
    queryKey: [...commentKeys.byTarget(target), 'stream'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        items: StreamItem[];
        hasMore: boolean;
      }>(API_ENDPOINTS.books.stream(bookId));
      return data;
    },
  });

  const items = data?.items ?? [];

  return (
    <section className='mt-6'>
      <h2 className='heading-2 mb-3 text-text-strong'>이 책의 기록</h2>

      {isLoading ? (
        <div className='flex justify-center py-8'>
          <Loader2 className='size-6 animate-spin text-muted-foreground' />
        </div>
      ) : items.length === 0 ? (
        <p className='rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이 책의 기록이 없어요.
        </p>
      ) : (
        <div className='space-y-3 border-t border-line-soft pt-4'>
          {items.map((item) =>
            item.kind === 'activity' ? (
              <BookStreamEvent
                key={item.id}
                activityType={item.activityType}
                content={item.content}
                createdAt={item.createdAt}
                rating={rating}
              />
            ) : (
              <div key={item.id} className='space-y-3'>
                <CommentItem comment={item} target={target} />
                {item.replies?.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    target={target}
                    isReply
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {currentUser && (
        <div className='mt-4 border-t border-line-soft pt-4'>
          <CommentForm target={target} placeholder='이 책에 댓글 남기기…' />
        </div>
      )}
    </section>
  );
};
```

- [ ] **Step 3: `BookDetailContent` 교체 + 옛 섹션 삭제**

```diff
-import { BookActivitySection } from './BookActivitySection';
+import { BookStreamSection } from './BookStreamSection';
```

```diff
-      <BookActivitySection bookId={book.id} />
+      <BookStreamSection bookId={book.id} rating={book.rating} />
```

```bash
git rm apps/page0127/src/widgets/book/ui/BookActivitySection.tsx
```

`src/widgets/book/`에는 배럴 파일(`index.ts`)이 없다 — `BookDetailContent`가 `./BookStreamSection`을 직접 import하므로 다른 곳을 고칠 필요가 없다. 다만 `BookActivitySection`을 참조하는 곳이 남았는지 확인한다.

Run: `cd apps/page0127 && grep -rn "BookActivitySection" src app`
Expected: 결과 없음

- [ ] **Step 4: 타입 검사·린트·테스트**

Run: `cd apps/page0127 && npm run type-check && npm run lint && npm test`
Expected: PASS

- [ ] **Step 5: 기존 e2e가 깨지지 않았는지 확인**

새 e2e는 추가하지 않는다(Global Constraints 참고). 기존 스모크가 여전히 통과하는지만 본다.

Run: `cd apps/page0127 && npm run test:e2e`
Expected: PASS (기존 3개 스펙)

- [ ] **Step 6: 로컬에서 눈으로 확인 (이 Task의 실질적 검수)**

`npm run dev:local`로 띄우고 로그인한 뒤 책 상세(`/books/[id]`)를 열어 아래를 하나씩 확인한다.

1. "이 책의 기록" 아래에 상태 변화(`담았어요` / `완독했어요`)가 **얇은 한 줄**로 보인다
2. 리뷰 활동이 있으면 그 줄 아래에 리뷰 본문이 붙는다
3. 이관된 옛 댓글이 상태 변화들 **사이에 시간순으로** 섞여 보인다
4. 하단 입력창에 댓글을 쓰면 새로고침 없이 스트림에 나타난다
5. 답글 → 부모 아래에 들여쓰기되어 붙는다
6. 남의 공개 책(`/{username}/{bookId}`)에서도 스트림이 보이고, 댓글 작성이 된다
7. 로그아웃 상태에서 공개 책을 보면 스트림은 보이되 입력창이 없다

- [ ] **Step 7: 커밋**

```bash
git add apps/page0127/src/widgets/book
git commit -m "feat(book): 책 상세를 활동·댓글 통합 스트림으로 교체"
```

---

## 계획 1 완료 상태

- 책 상세에서 상태 변화와 댓글이 하나의 스트림으로 보이고, 댓글 작성·수정·삭제가 동작한다
- 기존 활동 댓글·좋아요가 책 단위로 이관되어 있다
- 피드는 **아직 옛 모습**이다 — 활동마다 카드가 뜨고, 카드의 댓글 버튼은 그 책 스레드를 가리킨다(같은 책 카드끼리 같은 스레드를 보여주는 중복이 이 시점엔 남아 있다). 계획 2에서 피드를 책 단위로 바꾸며 해소한다
- 전역 책 스레드는 타입·엔드포인트만 준비돼 있고 라우트는 없다 — 계획 3 소관

## 다음 계획에서 다룰 것

- **계획 2**: `book_latest_activities` 뷰, 피드 중복 제거, 책 카드 재구성(요약 줄·리뷰 본문), 책 단위 좋아요 API·UI, 새 댓글 배지(`thread-read`)
- **계획 3**: 전역 책 스레드 라우트·UI, 전역 책 알림 라우팅, `activity_comments`/`activity_likes` 읽기 경로 제거
