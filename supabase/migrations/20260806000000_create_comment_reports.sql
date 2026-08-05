-- 댓글 신고 — 신고 접수 + 운영자 숨김
-- 작성일: 2026-08-06
--
-- 공개 서재·책 정보 페이지·팔로우 피드가 전부 열려 있는데 신고 창구가 없었다.
-- 유해한 댓글이 하나 올라오면 Supabase 콘솔에서 직접 지우는 것 말고 방법이 없었다.
--
-- 범위를 댓글로 좁힌 이유: 남에게 말을 거는 행위라 시비가 실제로 붙는 면이다.
-- 책 기록(한줄평)은 혼잣말에 가까워 빈도가 훨씬 낮다. 나중에 필요해지면
-- reports 에 book_id 컬럼 하나를 더하고 아래 CHECK 의 인자만 늘리면 된다.
--
-- book_comments 는 책 기록 댓글(book_id)과 책 정보 페이지 댓글(global_book_id)을
-- 한 테이블로 다루므로, 이 하나로 두 면이 모두 덮인다.

-- =====================================================
-- 1. 숨김 플래그 — 지우지 않고 가린다
-- =====================================================
--
-- 삭제가 아니라 숨김인 이유: 오판을 되돌릴 수 있고, 신고자와 작성자가 다투면
-- 무엇이 쓰여 있었는지 확인할 기록이 남는다.
ALTER TABLE book_comments
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN book_comments.is_hidden IS
  '운영자가 가린 댓글. 화면에서 사라지지만 행은 남는다(오판 복구·분쟁 대비).';

-- 목록 조회는 대부분 "안 가려진 것"만 본다
CREATE INDEX IF NOT EXISTS book_comments_visible_idx
  ON book_comments (book_id, created_at)
  WHERE is_hidden = false;

-- =====================================================
-- 2. 가려진 댓글은 아무에게도 안 보인다
-- =====================================================
--
-- 작성자에게도 안 보인다. 자기 글만 계속 보이면 "왜 아무도 답을 안 하지"로
-- 오해하고, 가려졌다는 사실 자체가 전달되지 않는다.
-- 운영자는 service_role 로 보므로 RLS 를 우회한다(어드민 화면은 그 키를 쓴다).
DROP POLICY IF EXISTS "Book comments are viewable by allowed viewers" ON book_comments;

CREATE POLICY "Book comments are viewable by allowed viewers"
  ON book_comments FOR SELECT
  USING (
    is_hidden = false
    AND (
      global_book_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM books b
        WHERE b.id = book_comments.book_id
          AND (b.is_public = true OR b.user_id = auth.uid())
      )
    )
  );

-- =====================================================
-- 3. 신고 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 신고자가 탈퇴해도 신고는 남는다(운영 기록). 누가 했는지만 지워진다.
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 대상. 지금은 댓글 하나뿐이지만 컬럼을 늘릴 수 있게 CHECK 형태로 둔다
  -- (book_comments_one_target 과 같은 방식).
  comment_id uuid REFERENCES book_comments(id) ON DELETE CASCADE,

  reason text NOT NULL
    CHECK (reason IN ('spam', 'abuse', 'sexual', 'other')),
  -- 사용자가 덧붙이는 설명. '기타'가 아니면 비어 있어도 된다.
  detail text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'rejected')),

  -- 처리 기록 — 누가 언제. 되돌릴 때 근거가 된다.
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reports_one_target CHECK (num_nonnulls(comment_id) = 1)
);

COMMENT ON TABLE reports IS
  '사용자 신고. 지금은 댓글만 받는다. 조치는 전부 사람이 한다(자동 숨김 없음).';

-- 같은 사람이 같은 댓글을 여러 번 신고해도 한 건으로 센다.
-- 탈퇴로 reporter_id 가 NULL 이 되면 유니크에서 빠지는데(NULL 은 서로 다르다),
-- 이미 접수된 신고라 문제되지 않는다.
CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_comment_key
  ON reports (reporter_id, comment_id)
  WHERE comment_id IS NOT NULL;

-- 어드민 목록은 "미처리 최신순"이 기본이다
CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON reports (status, created_at DESC);

-- =====================================================
-- 4. RLS
-- =====================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 내가 넣은 신고만 읽는다 — 화면이 "이미 신고함"을 표시하는 데 쓴다.
-- 남의 신고를 못 봐야 신고자가 노출되지 않는다.
DROP POLICY IF EXISTS "Users can read own reports" ON reports;
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- 신고는 로그인 사용자만, 자기 이름으로만 넣는다.
-- 볼 수 없는 댓글은 신고할 수 없고(EXISTS 가 RLS 를 통과한 행만 본다),
-- 자기 댓글도 신고할 수 없다.
DROP POLICY IF EXISTS "Users can report visible comments" ON reports;
CREATE POLICY "Users can report visible comments"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
      SELECT 1 FROM book_comments c
      WHERE c.id = reports.comment_id
        AND c.user_id IS DISTINCT FROM auth.uid()
    )
  );

-- 수정·삭제 정책 없음 → 일반 사용자는 접수 후 손댈 수 없다.
-- 운영자는 service_role 로 처리한다(RLS 우회).

-- =====================================================
-- 5. 권한
-- =====================================================
--
-- 20260725000001_lock_down_function_privileges.sql 방침: PUBLIC 회수 후 필요한 롤에만.
REVOKE ALL ON TABLE reports FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE reports TO authenticated;
GRANT ALL ON TABLE reports TO service_role;

-- Migration 완료
-- - book_comments.is_hidden — 가려진 댓글은 RLS 가 아무에게도 안 보여준다
-- - reports — 댓글 신고 접수. 중복 신고는 유니크로 막고, 자기 댓글은 RLS 가 막는다
-- - 조치는 전부 수동. 자동 숨김 임계값은 두지 않았다(악의적 신고로 정상 글이 사라진다)
