-- 체험 계정의 팔로우를 남에게서 숨기기 (2026-11-21)
--
-- 체험 계정이 제작자를 팔로우해 두면 리뷰어가 라운지 "새로운 기록"에서 실제 기록을 볼 수 있다.
-- 대신 팔로우 당한 쪽(제작자)의 팔로워 수가 +1 되고 팔로워 목록에 "체험 독자"가 보인다 → 숨긴다.
--
-- 1. follows: 체험 계정이 한 팔로우 행은 체험 계정 본인에게만 보인다 (RESTRICTIVE, books 와 같은 방식)
--    → 팔로워 목록·"이어진 사람" 판정·피드 대상에서 빠진다. 체험 계정 자신의 라운지는 그대로 동작.
-- 2. user_follow_stats: 뷰는 만든 사람 권한으로 돌아 RLS 를 건너뛰므로 팔로워 수 집계에서 직접 뺀다.
--    체험 계정 자신의 팔로잉 수는 그대로 센다(본인 서재에 "팔로잉 1").

drop policy if exists "Demo follows are visible only to the demo account" on public.follows;
create policy "Demo follows are visible only to the demo account"
  on public.follows
  as restrictive
  for select
  to anon, authenticated
  using (
    follower_id = (select auth.uid())
    or follower_id <> all (array(select public.demo_user_ids()))
  );

CREATE OR REPLACE VIEW user_follow_stats AS
SELECT
  u.id AS user_id,
  COALESCE(follower_count.count, 0) AS followers_count,
  COALESCE(following_count.count, 0) AS following_count
FROM
  auth.users u
LEFT JOIN (
  SELECT following_id, COUNT(*) AS count
  FROM follows
  WHERE follower_id <> ALL (ARRAY(SELECT public.demo_user_ids()))
  GROUP BY following_id
) follower_count ON u.id = follower_count.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) AS count
  FROM follows
  GROUP BY follower_id
) following_count ON u.id = following_count.follower_id;
