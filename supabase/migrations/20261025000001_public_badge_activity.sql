-- 배지에 필요한 근거만 공개한다. 방문 원본·상대방·점수·분석 내용은 공개하지 않는다.
-- 기존 기록을 소급 사용한다. 방문일은 KST 하루 1행인 user_daily_visits가 기준이다.
CREATE OR REPLACE FUNCTION public.get_public_badge_activity(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH visits AS (
    SELECT v.visit_date, row_number() OVER (ORDER BY v.visit_date) AS n
    FROM public.user_daily_visits v
    WHERE v.user_id = p_user_id
      AND v.visit_date <= (now() AT TIME ZONE 'Asia/Seoul')::date
  )
  SELECT jsonb_build_object(
    'firstTasteAnalysisAt', (SELECT min(t.created_at) FROM public.taste_analyses t WHERE t.user_id = p_user_id),
    'firstCompatibilityAt', (SELECT min(c.created_at) FROM public.compatibility_analyses c WHERE c.user_id_1 = p_user_id OR c.user_id_2 = p_user_id),
    -- 실제 누적 방문일은 본인만, 방문자는 달성한 단계만 받는다.
    'visitCount', CASE WHEN auth.uid() = p_user_id THEN (SELECT count(*) FROM visits) END,
    'visitMilestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('target', n, 'at', visit_date) ORDER BY n)
      FROM visits WHERE n IN (7, 30, 100)
    ), '[]'::jsonb)
  )
  WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_badge_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_badge_activity(uuid) TO anon, authenticated;
COMMENT ON FUNCTION public.get_public_badge_activity(uuid) IS
  '배지용 첫 분석 시각과 방문 달성 단계만 공개. 실제 방문일수는 본인에게만 반환.';

NOTIFY pgrst, 'reload schema';
