-- 책등을 채워도 저장이 통째로 취소되던 문제를 고친다.
--
-- 원인: 내 책(books)에 책등을 채우면 books_sync_global_spine_image 트리거
-- (20261027000000)가 전체 도서(global_books)의 빈 책등도 같은 주소로 채운다. 이 UPDATE 에도
-- 검수 보호 트리거 guard_catalog_submission(20261028000000~)이 도는데, 일반 사용자가
-- 승인된 책을 고치는 것으로 보고 '이 도서 정보는 수정할 수 없습니다.' 예외를 던져
-- books 갱신까지 롤백됐다. 10/28 이후 전체 도서에 처음 들어온 책은 어디서 등록해도
-- 책등이 저장되지 않았다(2026-11-04 운영 로그: 미움받을 용기·엔시티피케이션).
--
-- 고침: 트리거 안에서 일어난 갱신(pg_trigger_depth() > 1) 중 바뀐 것이 spine_image 하나이고,
-- 빈 값을 그 책 상품번호의 YES24 정식 책등 주소로 채우는 것뿐이면 그대로 통과시킨다.
-- 직접 등록 책(manual)은 책등을 받지 않으므로 제외한다. 사용자가 직접 보내는 UPDATE 는
-- 깊이가 1 이라 이 길로 못 온다. 검수 상태·버전도 건드리지 않는다.
--
-- 나머지 본문은 20261104000000 의 함수와 같다.
begin;

create or replace function public.guard_catalog_submission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1
     and old.spine_image is null
     and old.source is distinct from 'manual'
     and old.provider_item_id is not null
     and new.spine_image = 'https://image.yes24.com/goods/' || old.provider_item_id || '/SIDE/XL'
     and (to_jsonb(new) - 'spine_image') = (to_jsonb(old) - 'spine_image') then
    return new;
  end if;
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
