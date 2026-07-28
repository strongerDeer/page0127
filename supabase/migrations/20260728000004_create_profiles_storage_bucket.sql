-- 프로필 이미지 Storage 버킷과 접근 정책을 코드로 고정한다.
--
-- 배경: 운영의 `profiles` 버킷은 2025-12-11 에 대시보드에서 손으로 만들어졌고 정책
-- 3종도 마찬가지였다. 마이그레이션에 없다 보니 2026-07-27 개발 프로젝트(page0127-dev)를
-- 새로 만들었을 때 딸려오지 않았고, Preview 에서 프로필 이미지 업로드가
-- "Bucket not found"(404)로 실패했다. 스키마는 41개가 그대로 복제됐는데 Storage 만
-- 비어 있어, "마이그레이션이 다 적용됐으니 환경이 같다"는 판단이 어긋난 사례다.
--
-- 번호 주의: 처음 ...000003 으로 만들었다가 ...000004 로 밀었다. 같은 날 다른 브랜치가
-- ...000002·...000003 을 이미 쓰고 있었다(main 에 ...000002 가 두 파일에 붙어 있는 상태다).
-- 만들기 전에 `git ls-tree origin/main supabase/migrations/` 로 원격 기준의 마지막 번호를
-- 확인할 것 — 로컬 브랜치의 tail 만 보면 병렬 세션이 밀어 넣은 번호를 못 본다.
--
-- 새 환경을 만들 때마다 반복될 문제라 코드로 옮긴다. 운영·개발 모두 이미 같은 이름으로
-- 존재하므로 **모든 구문이 idempotent** 해야 한다. `create policy` 는 IF NOT EXISTS 를
-- 지원하지 않아 pg_policies 를 직접 확인한다(그냥 실행하면 42710 으로 push 가 막힌다).

insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

do $$
begin
  -- 조회: 공개 서재를 로그인 없이 볼 수 있어야 하므로 익명에게도 연다.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public Access'
  ) then
    create policy "Public Access" on storage.objects
      for select using (bucket_id = 'profiles');
  end if;

  -- 업로드: 로그인한 사용자만. 대상 버킷도 함께 검사해 다른 버킷으로 새지 않게 한다.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Authenticated users can upload'
  ) then
    create policy "Authenticated users can upload" on storage.objects
      for insert with check (
        bucket_id = 'profiles' and auth.role() = 'authenticated'
      );
  end if;

  -- 삭제: 본인 파일만. 파일명이 `avatars/{userId}_{timestamp}.ext` 라 앞부분으로
  -- 소유자를 가린다. updateProfileAction 의 명명 규칙과 짝을 이루므로
  -- **한쪽만 바꾸면 사용자가 자기 이미지를 못 지운다**.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can delete own files'
  ) then
    create policy "Users can delete own files" on storage.objects
      for delete using (
        bucket_id = 'profiles'
        and (storage.foldername(name))[1] = 'avatars'
        and (auth.uid())::text = split_part(storage.filename(name), '_', 1)
      );
  end if;
end $$;
