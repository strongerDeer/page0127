-- 운영자 개인 테스트 계정 표시 (2026-11-24)
--
-- 어드민 지표는 getAdminUserIds 로 "뺄 사람"을 모아 같은 기준으로 센다.
-- 지금까지는 ADMIN_EMAILS(운영자)와 profiles.is_demo(체험 계정)만 뺐는데,
-- 운영자가 따로 만든 테스트 계정(다른 이메일·다른 가입 경로)은 진짜 회원으로 세졌다.
-- 베타 회원 수십 명 사이에 테스트 계정 2개는 회원 수·활성 회원을 눈에 띄게 부풀린다.
--
-- 왜 환경변수(이메일 목록)가 아니라 컬럼인가:
--   계정을 넣고 뺄 때마다 Vercel env 수정 + 재배포가 필요 없고, 어드민 회원 상세에서
--   바로 켜고 끈다. 체험 계정(is_demo)과 같은 모양이라 지표 코드도 한 줄로 같이 거른다.
--   또 탈퇴할 때 이 표시를 보고 탈퇴 기록(account_deletions)에 남기지 않을 수 있다.

alter table public.profiles
  add column if not exists is_test boolean not null default false;

comment on column public.profiles.is_test is
  '운영자 테스트 계정. 어드민 지표·탈퇴 기록에서 빠진다. service_role(어드민)만 바꿀 수 있다.';

-- anon/authenticated 에는 SELECT 를 주지 않는다. profiles 는 열 단위 GRANT 라
-- 새 열은 기본으로 안 보인다. 어드민(service_role)만 읽으면 되는 값이다.

-- 사용자가 자기 프로필을 고칠 때 is_test 를 켜고 끄지 못하게 한다.
-- (켜면 스스로 지표에서 빠진다) 20261121000100 의 함수에 한 줄 더한다.
create or replace function public.protect_profile_moderation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.status := 'active';
      new.suspended_until := null;
      new.is_demo := false;
      new.is_test := false;
    else
      new.status := old.status;
      new.suspended_until := old.suspended_until;
      new.is_demo := old.is_demo;
      new.is_test := old.is_test;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_moderation_columns() from public, anon, authenticated;
