-- AI 전역 월 예산 한도 — 예산을 넘으면 유료 호출을 완전히 차단한다
-- 작성일: 2026-08-08
--
-- 지금은 1인 월 3회 제한만 있다. 사용자가 10명이면 월 30회, 100명이면 300회다.
-- **전체 사용액이 예산을 넘어도 아무것도 막지 않는다** — 어드민 게이지만 빨개진다.
-- 개인 프로젝트에서 이건 청구서로 돌아온다.
--
-- 왜 여기(reserve_ai_usage)인가:
-- 이미 OpenAI 호출 직전의 원자적 관문이다. advisory lock 안에서 판정하므로
-- 동시 요청이 한도를 함께 넘기는 일이 없다. 관문을 하나 더 만들면 두 곳이
-- 어긋난다.
--
-- 예산 값을 SQL 에 박지 않는 이유:
-- 앱이 이미 MONTHLY_BUDGET_KRW·USD_TO_KRW 를 갖고 있다. 여기에 또 적으면
-- 환율을 고칠 때 한쪽만 바뀌어 **막는 기준과 보여주는 기준이 달라진다.**
-- 그래서 상한을 인자로 받는다.

CREATE OR REPLACE FUNCTION reserve_ai_usage(
  p_feature text,
  -- 이번 달 전체 허용 상한(USD 센트). NULL 이면 전역 한도를 보지 않는다
  -- (기존 호출 호환 — 인자를 안 주면 예전과 똑같이 동작한다).
  p_budget_cents integer DEFAULT NULL
)
RETURNS TABLE(allowed boolean, remaining integer, usage_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_used int;
  v_new_id uuid;
  v_spent_cents int;
  v_monthly_limit constant int := 3;
  v_start_of_month timestamptz :=
    date_trunc('month', now() at time zone 'Asia/Seoul')
    at time zone 'Asia/Seoul';
begin
  if v_user is null then
    return query select false, 0, null::uuid;
    return;
  end if;

  if p_feature not in ('taste_analysis', 'compatibility') then
    raise exception 'Unsupported AI usage feature'
      using errcode = '22023';
  end if;

  -- 전역 예산 확인 — **개인 한도보다 먼저** 본다.
  -- 락을 잡기 전에 확인해 예산이 끝난 상태에서 불필요한 직렬화를 피한다.
  -- 여기서 세는 것은 실제 청구 기준인 cost_in_cents 다(호출 횟수가 아니다).
  if p_budget_cents is not null then
    select coalesce(sum(cost_in_cents), 0) into v_spent_cents
    from (
      select cost_in_cents from taste_analyses where created_at >= v_start_of_month
      union all
      select cost_in_cents from compatibility_analyses where created_at >= v_start_of_month
    ) spend;

    if v_spent_cents >= p_budget_cents then
      -- remaining 은 개인 잔여 횟수를 뜻하는 자리다. 전역 차단일 때는
      -- 개인 횟수가 남아 있어도 쓸 수 없으므로 0 으로 알린다.
      return query select false, 0, null::uuid;
      return;
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_user::text || ':' || p_feature)::bigint
  );

  select count(*)
    into v_used
    from ai_usage_logs
   where user_id = v_user
     and feature = p_feature
     and created_at >= v_start_of_month;

  if v_used >= v_monthly_limit then
    return query select false, 0, null::uuid;
    return;
  end if;

  insert into ai_usage_logs (user_id, feature)
  values (v_user, p_feature)
  returning id into v_new_id;

  return query
    select true, v_monthly_limit - (v_used + 1), v_new_id;
end;
$function$;

COMMENT ON FUNCTION reserve_ai_usage(text, integer) IS
  'AI 호출 슬롯을 원자적으로 예약한다. 전역 예산(p_budget_cents)과 1인 월 3회를 함께 본다. 상한은 앱이 넘긴다 — 값을 두 곳에 두지 않기 위해서다.';

-- 20260725000001 방침: PUBLIC 회수 후 실제로 쓰는 롤에만
REVOKE ALL ON FUNCTION reserve_ai_usage(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reserve_ai_usage(text, integer) TO authenticated;

-- ⚠️ 인자가 하나인 옛 시그니처를 남겨 두면 **전역 한도를 안 보는 경로가 남는다.**
-- 배포된 앱이 두 인자로 부르므로 옛 것은 지운다.
DROP FUNCTION IF EXISTS reserve_ai_usage(text);

-- Migration 완료
-- - 전역 예산을 넘기면 예약 자체가 거부된다(OpenAI 호출 전에 막힌다)
-- - 상한은 앱이 인자로 넘긴다 — 환율·예산을 고칠 때 한 곳만 고치면 된다
-- - 인자 1개짜리 옛 함수는 제거해 우회 경로를 남기지 않는다
