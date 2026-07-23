-- 이미 운영에 적용된 reserve_ai_usage의 안전하지 않은 인자를 제거한다.
-- 월 시작일과 월 한도는 호출자가 전달하지 않고 DB 내부에서 강제한다.

drop function if exists reserve_ai_usage(text, timestamptz, int);

create or replace function reserve_ai_usage(p_feature text)
returns table(allowed boolean, remaining int, usage_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_used int;
  v_new_id uuid;
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
    select true, greatest(0, v_monthly_limit - (v_used + 1)), v_new_id;
end;
$$;

-- 일반 사용자는 테이블에 직접 사용 기록을 넣을 수 없고,
-- 한도를 원자적으로 검사하는 함수만 호출할 수 있다.
drop policy if exists "Users can insert their own usage logs" on ai_usage_logs;

revoke all on function reserve_ai_usage(text) from public;
revoke all on function reserve_ai_usage(text) from anon;
grant execute on function reserve_ai_usage(text) to authenticated;
