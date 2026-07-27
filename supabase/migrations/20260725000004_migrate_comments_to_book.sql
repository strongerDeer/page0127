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
