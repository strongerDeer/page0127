-- 팔로우 목록은 본인만 (2026-11-23, 베타 전 프라이버시 정리)
--
-- 이전: "Anyone can view follows" USING (true)
--   → 공개 anon 키로 REST(/rest/v1/follows)를 직접 부르면 API 를 거치지 않고도
--     모든 사람의 "누가 누구를 팔로우하는지"가 나왔다. 화면에서 버튼을 숨겨도 소용없다.
--
-- 이후: 내가 끼어 있는 행(내가 팔로우한 것 + 나를 팔로우한 것)만 보인다.
--   - 앱의 follows 조회는 전부 이 범위다: 이어진 사람(getConnectionIds), 피드, 팔로우 여부,
--     activities RLS 의 EXISTS(follower_id = auth.uid()), 내 팔로워·팔로잉 목록.
--   - 리그·편지 RPC 는 SECURITY DEFINER 라 이 정책과 무관하다.
--   - 팔로워/팔로잉 **숫자**는 user_follow_stats 뷰(소유자 권한, RLS 를 건너뜀)에서 나오므로 그대로 공개된다.
--     뷰는 숫자만 내보내고 "누가"는 내보내지 않는다.
--   - 체험 계정 RESTRICTIVE 정책(20261121000200)은 그대로 둔다 — 두 조건이 AND 로 함께 걸린다.

drop policy if exists "Anyone can view follows" on public.follows;
drop policy if exists "Users can view their own follows" on public.follows;

create policy "Users can view their own follows"
  on public.follows
  for select
  to authenticated
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = following_id
  );
