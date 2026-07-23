-- AI 사용량 원자적 예약 함수
-- 작성일: 2026-07-23
--
-- 문제: 기존 흐름은 "카운트 조회 → OpenAI 호출 → 로그 insert" 순서라,
-- 동시에 들어온 두 요청이 모두 카운트 조회를 통과한 뒤 각자 OpenAI를 호출해
-- 월 한도(3회)를 넘겨 유료 API를 중복 호출할 수 있었다.
--
-- 해결: 카운트 확인과 로그 insert를 한 트랜잭션에서 원자적으로 수행하고,
-- 같은 (사용자, 기능) 요청은 advisory lock으로 직렬화해 경쟁을 없앤다.
-- OpenAI 호출 "전에" 슬롯을 예약(insert)하므로 초과 호출 자체가 불가능하다.
-- 예약한 usage 행의 id를 돌려주어, OpenAI 호출 전에 실패한 경우에만 서버가
-- 그 행을 정확히 삭제(환불)할 수 있게 한다.

-- 이전 개발 버전의 안전하지 않은 시그니처가 적용된 환경도 정리한다.
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
  -- 인증되지 않은 호출은 거부 (usage_id 없이 allowed=false)
  if v_user is null then
    return query select false, 0, null::uuid;
    return;
  end if;

  -- SECURITY DEFINER 함수이므로 허용된 기능 외 값은 DB 안에서 거부한다.
  if p_feature not in ('taste_analysis', 'compatibility') then
    raise exception 'Unsupported AI usage feature'
      using errcode = '22023';
  end if;

  -- 같은 사용자+기능 동시 요청을 직렬화한다.
  -- 트랜잭션이 끝나면 자동으로 풀리는 advisory lock이라 별도 해제가 필요 없다.
  perform pg_advisory_xact_lock(
    hashtext(v_user::text || ':' || p_feature)::bigint
  );

  -- KST 기준 이번 달 사용 횟수. 시작 시각과 한도는 호출자가 조작할 수 없다.
  select count(*)
    into v_used
    from ai_usage_logs
   where user_id = v_user
     and feature = p_feature
     and created_at >= v_start_of_month;

  -- 한도 초과: 예약하지 않고 거부
  if v_used >= v_monthly_limit then
    return query select false, 0, null::uuid;
    return;
  end if;

  -- 슬롯 예약: 로그 1건 삽입 (여기서 카운트가 1 늘어난다)
  insert into ai_usage_logs (user_id, feature)
  values (v_user, p_feature)
  returning id into v_new_id;

  return query
    select true, greatest(0, v_monthly_limit - (v_used + 1)), v_new_id;
end;
$$;

-- 일반 사용자의 테이블 직접 INSERT를 막고, 원자적 예약 함수만 허용한다.
drop policy if exists "Users can insert their own usage logs" on ai_usage_logs;

-- 실행 권한: 로그인 사용자(authenticated)만.
-- 반대로 "환불(삭제)"은 이 함수에 두지 않는다 — 사용자에게 삭제 경로를 열면
-- 자기 사용 기록을 지워 한도를 무한 리셋할 수 있어서다.
-- 환불은 서버가 service_role 클라이언트로 예약 행 id만 지우는 방식으로 처리한다.
revoke all on function reserve_ai_usage(text) from public;
revoke all on function reserve_ai_usage(text) from anon;
grant execute on function reserve_ai_usage(text) to authenticated;
