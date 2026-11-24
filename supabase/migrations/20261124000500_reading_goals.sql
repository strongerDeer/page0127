-- 연도별 독서 목표 — 해마다 정한 목표를 남긴다
-- 작성일: 2026-11-24
--
-- 왜 (HJ, 2026-11-24): 전체 보기의 "연도별 완독 추이"에 그 해 목표와 실제 완독 권수를 겹쳐 보고 싶다.
-- 그런데 profiles.reading_goal 은 {year, target} JSONB 하나라, 올해 목표를 정하면 작년 목표가 덮여 사라졌다.
-- → 이력이 필요한 값은 "덮어쓰는 칸"이 아니라 "쌓이는 행"으로 둔다(사용자·연도마다 한 행).
--
-- profiles.reading_goal 은 그대로 둔다(연도 요약·배지·공유 카드가 "지금 목표"로 읽는다).
-- 목표를 쓰는 길(서버 액션 두 곳, 어드민·SQL)이 모두 profiles 를 고치므로, 앱마다 두 번 쓰게 하는 대신
-- profiles 트리거가 이 표로 옮겨 적는다 — 쓰는 길을 하나 빠뜨려 이력이 비는 일이 없다.
--
-- 공개 범위: 목표는 원래 공개다(profiles.reading_goal 을 방문자도 읽는다). 읽기는 모두에게 연다.
-- 방문자에게 "못 채운 목표"를 숨기는 건 화면 규칙이다(YearSummary·YearlyTrendChart, 2026-11-24).

CREATE TABLE IF NOT EXISTS public.reading_goals (
  -- profiles 를 가리킨다 — 트리거가 profiles 행에서 옮겨 적으니 늘 짝이 있다(탈퇴로 profiles 가 지워지면 함께)
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  target integer NOT NULL CHECK (target BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reading goals" ON public.reading_goals;
CREATE POLICY "Anyone can read reading goals" ON public.reading_goals
  FOR SELECT USING (true);

-- 쓰기는 트리거(SECURITY DEFINER)만 한다 — 사용자에게 직접 쓰기 정책을 열지 않는다
GRANT SELECT ON public.reading_goals TO anon, authenticated;

-- profiles.reading_goal 이 바뀌면 그 해 목표를 옮겨 적는다(같은 해면 덮어쓴다 — 한 해에 목표는 하나)
CREATE OR REPLACE FUNCTION public.sync_reading_goal_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_target integer;
BEGIN
  -- 기본값 '{}'·이상한 값은 건너뛴다 — 목표 저장 자체를 막지 않는다
  BEGIN
    v_year := (NEW.reading_goal ->> 'year')::integer;
    v_target := (NEW.reading_goal ->> 'target')::integer;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  IF v_year IS NULL OR v_target IS NULL
     OR v_year NOT BETWEEN 1900 AND 2100
     OR v_target NOT BETWEEN 1 AND 1000 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.reading_goals (user_id, year, target)
  VALUES (NEW.id, v_year, v_target)
  ON CONFLICT (user_id, year)
  DO UPDATE SET target = EXCLUDED.target, updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_reading_goal_history() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_reading_goal_history ON public.profiles;
CREATE TRIGGER sync_reading_goal_history
  AFTER INSERT OR UPDATE OF reading_goal ON public.profiles
  FOR EACH ROW
  WHEN (NEW.reading_goal IS NOT NULL)
  EXECUTE FUNCTION public.sync_reading_goal_history();

-- 지금 남아 있는 목표(사람마다 마지막 한 해)를 첫 행으로 옮긴다. 지난 목표는 덮여 사라져 되살릴 수 없다.
INSERT INTO public.reading_goals (user_id, year, target)
SELECT p.id, (p.reading_goal ->> 'year')::integer, (p.reading_goal ->> 'target')::integer
FROM public.profiles p
WHERE p.reading_goal ->> 'year' ~ '^\d{4}$'
  AND p.reading_goal ->> 'target' ~ '^\d{1,4}$'
  AND (p.reading_goal ->> 'target')::integer BETWEEN 1 AND 1000
ON CONFLICT (user_id, year) DO NOTHING;
