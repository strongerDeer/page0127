-- 탈퇴(계정 삭제)가 "Database error deleting user" 로 실패하던 문제를 고친다.
--
-- 원인: global_books.submitted_by·reviewed_by 는 auth.users 를 ON DELETE SET NULL 로 참조한다.
-- 직접 등록한 책이 있는 사용자를 지우면 Postgres 가 그 행을 UPDATE 해 값을 비우는데,
-- 이 UPDATE 에도 BEFORE 트리거 guard_catalog_submission 이 돈다. 탈퇴는 Auth 서버가
-- 처리하므로 JWT 역할이 없고(auth.role() = NULL) → "일반 사용자의 수정"으로 보고
-- '이 도서 정보는 수정할 수 없습니다.' 예외를 던져 삭제 전체가 롤백됐다.
--
-- 고침: 트리거 안에서 일어난 갱신(pg_trigger_depth() > 1 — FK 연쇄 동작도 트리거다) 중
-- 바뀐 것이 submitted_by·reviewed_by 를 NULL 로 비운 것뿐이면 그대로 통과시킨다.
-- 사용자가 직접 보내는 UPDATE 는 깊이가 1 이라 이 길로 못 오고, 제출자를 비우는 것도
-- RLS(with check submitted_by = auth.uid())가 막는다. 검수 상태·버전도 건드리지 않는다
-- — 탈퇴한 사람의 책이 승인 상태였다면 그대로 승인으로 남아야 한다.
--
-- 나머지 본문은 20261101000100 의 함수와 같다.
begin;

create or replace function public.guard_catalog_submission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1
     and (new.submitted_by is null or new.submitted_by is not distinct from old.submitted_by)
     and (new.reviewed_by is null or new.reviewed_by is not distinct from old.reviewed_by)
     and (to_jsonb(new) - 'submitted_by' - 'reviewed_by')
         = (to_jsonb(old) - 'submitted_by' - 'reviewed_by') then
    return new;
  end if;
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'UPDATE' and (old.submitted_by is distinct from auth.uid() or old.review_status = 'approved') then
      raise exception '이 도서 정보는 수정할 수 없습니다.' using errcode = '42501';
    end if;
    new.source := 'manual';
    new.provider_item_id := null;
    new.review_status := 'pending';
    new.submitted_by := case when tg_op = 'INSERT' then auth.uid() else old.submitted_by end;
    new.review_note := null; new.reviewed_by := null; new.reviewed_at := null;
    if tg_op = 'UPDATE' then new.isbn := old.isbn; end if;
  end if;
  if new.source = 'manual' then
    -- 제출자가 자기 폴더에 올린 표지만 남긴다. 책등·뒷표지는 받지 않는다.
    if not public.is_own_manual_cover(new.cover_image, new.submitted_by) then
      new.cover_image := null;
    end if;
    new.spine_image := null; new.back_image := null;
    new.provider_item_id := null;
  end if;
  new.review_version := case when tg_op = 'INSERT' then 1 else old.review_version + 1 end;
  return new;
end;
$$;

commit;
