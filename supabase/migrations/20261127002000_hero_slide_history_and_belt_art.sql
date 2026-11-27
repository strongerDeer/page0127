-- 메인 배너 ① 띠지 배경 그림 ② 수정 기록 (2026-11-27 HJ)
--
-- ① 띠지 배경 그림
--   기본 띠지와 배너 띠지가 똑같이 "글자만" 있어 배너인지 알아채기 어려웠다.
--   띠지에 그림을 깔 수 있게 한다 — 높이 꽉 차게, 오른쪽 붙임(위치·크기 값은 두지 않는다).
--   파일은 표지 그림과 같은 banner-art 버킷에 올리고, 주소 검사도 서버 액션이 같은 규칙으로 한다.
ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS belt_art_url text;

-- ② 수정 기록
--   배너가 편집 카드로만 쌓여 "언제 무엇을 바꿨는지"가 남지 않았다.
--   어드민 서버 액션(service_role)이 만들기·저장·켜기/끄기·복제·삭제·순서 때 한 줄씩 남긴다.
--   삭제해도 기록은 남도록 slide_id 는 SET NULL, 그때 이름은 slide_title 로 따로 든다.
--   changes 는 저장 때 바뀐 칸만 {"칸": {"from": 이전, "to": 이후}} 로 담는다.
CREATE TABLE IF NOT EXISTS public.hero_slide_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slide_id    uuid REFERENCES public.hero_slides (id) ON DELETE SET NULL,
  slide_title text NOT NULL DEFAULT '',
  action      text NOT NULL
    CHECK (action IN ('create', 'update', 'activate', 'deactivate', 'duplicate', 'delete', 'reorder')),
  changes     jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 어드민 화면은 "최근 기록"(전체 최신순)과 "이 배너의 기록"(배너별 최신순)을 읽는다
CREATE INDEX IF NOT EXISTS hero_slide_events_created_idx
  ON public.hero_slide_events (created_at DESC);
CREATE INDEX IF NOT EXISTS hero_slide_events_slide_created_idx
  ON public.hero_slide_events (slide_id, created_at DESC);
-- FK(actor_id) 삭제 시 SET NULL 을 찾을 때 순차 검색을 피한다
CREATE INDEX IF NOT EXISTS hero_slide_events_actor_idx
  ON public.hero_slide_events (actor_id);

-- 읽기·쓰기 정책 없음 → anon·authenticated 키로는 아무것도 못 한다. 어드민은 service_role 로만.
ALTER TABLE public.hero_slide_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_slide_events FROM anon, authenticated;
