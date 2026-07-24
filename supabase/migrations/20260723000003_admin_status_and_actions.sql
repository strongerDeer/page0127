-- Admin: 회원 정지 상태 미러 + 관리자 행위 감사 로그
-- 작성일: 2026-07-23

-- 1) profiles: 정지 상태(표시용 미러). 실제 차단은 Supabase Auth 네이티브 ban.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
-- suspended_until: null = 영구(정지 중) 또는 미정지. 값 있으면 그 시각까지 임시 정지.

-- 2) admin_actions: 누가·언제·왜 정지/해제했는지
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,          -- 'suspend' | 'unsuspend'
  reason text,
  duration_days int,             -- null = 영구
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin은 service_role로 우회하므로 정책 없이 활성화만(일반 유저 차단)
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- (merge) AI 사용량 원자적 예약 함수
-- 원래 20260723000003_create_reserve_ai_usage_fn.sql 로 분리돼 있었으나, 같은 버전 번호
-- 중복 때문에 `supabase db reset`이 실패해 이 파일로 합쳤다(2026-07-24). 두 SQL은 서로
-- 독립적이며 모두 멱등이라 합쳐도 결과가 같다. (운영은 이 버전을 이미 적용해 skip됨)
-- ─────────────────────────────────────────────────────────────

-- AI 사용량 원자적 예약 함수
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
