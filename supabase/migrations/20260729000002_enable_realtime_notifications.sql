-- 알림 실시간 구독(Realtime) 활성화
--
-- useNotificationRealtime 훅이 notifications 테이블의 변경을 WebSocket으로 받아
-- 종 배지와 목록을 갱신한다. 그런데 Supabase Realtime은 테이블을
-- supabase_realtime publication 에 넣어야만 이벤트를 내보낸다.
--
-- 운영 DB는 대시보드에서 손으로 켜둔 상태였고 개발 DB는 꺼져 있었다.
-- 그 결과 개발/Preview 에서는 새 알림이 와도 이벤트가 오지 않아,
-- useUnreadCount 의 staleTime(5분)이 지나거나 새로고침할 때까지 배지가 그대로였다.
-- (useUnreadCount 는 "Realtime 으로 받으니 폴링 불필요"라며 refetchInterval 을 껐다)
--
-- 환경마다 조용히 어긋나지 않도록 마이그레이션으로 남긴다.
-- 이미 추가된 DB(운영)에서는 중복 추가가 에러가 되므로 존재 여부를 먼저 확인한다.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
