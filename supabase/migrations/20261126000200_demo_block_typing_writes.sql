-- 체험 계정 쓰기 차단을 11/21 이후 생긴 사용자 기록 표에도 붙인다.
--
-- 20261121000100_demo_account.sql 은 그때 있던 표에만 zz_block_demo_writes 를 걸었다.
-- 그 뒤 생긴 typing_records(필사 기록)는 목록에서 빠져, record_typing_page 를
-- 체험 계정 토큰으로 직접 부르면 기록이 쌓였다(화면 경로는 서버 액션이 막고 있었다).
-- reading_goals 는 쓰기 권한이 서버(service_role)에만 있어 지금은 영향이 없지만,
-- 사용자 기록 표라 같은 원칙으로 함께 건다.
--
-- SECURITY DEFINER 함수 안에서도 request.jwt.claims 는 그대로라 is_demo_request() 가 체험을 알아본다.
-- ⚠️ 사용자 기록 표를 새로 만들면 여기처럼 트리거를 붙인다 — app/demo-db-triggers.test.ts 가 지킨다.
do $$
declare
  t text;
begin
  foreach t in array array['typing_records', 'reading_goals']
  loop
    execute format('drop trigger if exists zz_block_demo_writes on public.%I', t);
    execute format(
      'create trigger zz_block_demo_writes
         before insert or update or delete on public.%I
         for each statement execute function public.block_demo_writes()',
      t
    );
  end loop;
end;
$$;
