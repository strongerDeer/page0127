-- =====================================================
-- 비회원 필사 닉네임: 한글 자음·모음(ㅎㅎㅎ, ㅋㅋ)도 허용 (HJ 2026-11-26 B안)
--
-- 왜: "ㅎㅎㅎ"를 적으면 "한글·영문·숫자만 쓸 수 있어요"로 막혀 헷갈렸다.
-- 한글 호환 자모(ㄱ~ㅣ, U+3131~U+3163)를 완성형·영문·숫자와 함께 받는다.
-- 길이(2~10자)는 그대로. 남에게는 지금처럼 첫 글자만 보인다("ㅎ**").
--
-- 앱 검사(guestNickname.ts)와 같은 규칙이다. 이 파일을 먼저 push 한 뒤 코드를 배포한다
-- (코드가 먼저 나가면 자모 닉네임이 DB CHECK 에 걸려 "랭킹에 올리지 못했어요"가 된다).
-- =====================================================

-- 처음 만들 때 열 안에 적은 CHECK 라 이름이 자동으로 붙었다(보통 typing_guest_scores_nickname_check).
-- 이름이 달라도 놓치지 않게, nickname 정규식을 검사하는 CHECK 를 모두 찾아 지운다.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.typing_guest_scores'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%nickname%~%'
  LOOP
    EXECUTE format('ALTER TABLE public.typing_guest_scores DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.typing_guest_scores
  ADD CONSTRAINT typing_guest_scores_nickname_check CHECK (
    char_length(nickname) BETWEEN 2 AND 10
    AND nickname ~ '^[가-힣ㄱ-ㅣa-zA-Z0-9]+$'
  );
