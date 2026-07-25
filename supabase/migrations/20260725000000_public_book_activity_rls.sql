-- 공개 책의 활동/댓글을 방문자(비로그인 포함)도 조회할 수 있게 하고,
-- activity_comments의 과도한 SELECT 정책(취약점)을 "조회 가능한 활동의 댓글"로 좁힌다.
--
-- 배경: 책 상세 "이 책의 기록" 타임라인은 책의 is_public을 따라 공개된다. 기존 RLS는
-- activities를 "본인/팔로워"만 조회하게 했고, activity_comments는 "로그인 사용자면 모든
-- 댓글(TO authenticated USING(true))"이라 (1) 공개 책 방문자가 활동을 못 봤고, (2) 로그인
-- 사용자는 activity_id만 알면 비공개 책 댓글까지 볼 수 있었다(취약점 — books에서
-- 20260723000001로 이미 고친 것과 동일 패턴).
--
-- 조치:
--   activities       : "책이 공개면 그 책 활동을 누구나" 정책 추가(기존 본인/팔로워에 OR).
--   activity_comments: 과도한 블랭킷 정책을 제거하고, "볼 수 있는 활동(본인·팔로워·공개책)
--                      의 댓글만" 단일 정책으로 교체 → activities SELECT 범위와 일치.
--   activity_likes    : 이미 "Anyone can view likes" USING(true)라 조치 불필요.
--
-- 안전성: 비공개 책은 books RLS + 아래 is_public 조건으로 이중 차단된다. 모든 구문은
-- idempotent(drop if exists → create)하여 재적용·운영 반영도 안전하다.

-- 1) activities: 책이 공개면 그 책의 활동을 누구나 조회 (기존 본인/팔로워 정책에 OR로 더해짐)
drop policy if exists "Public book activities are viewable by anyone" on activities;
create policy "Public book activities are viewable by anyone"
  on activities for select
  using (
    exists (
      select 1 from books
      where books.id = activities.book_id
        and books.is_public = true
    )
  );

-- 2) activity_comments: 과도한 블랭킷 SELECT 정책 제거 → "조회 가능한 활동의 댓글만"
--    (본인 활동 · 팔로우한 사용자 활동 · 공개 책 활동 = activities SELECT 범위와 동일)
drop policy if exists "댓글은 모두가 볼 수 있습니다" on activity_comments;
drop policy if exists "Public book activity comments are viewable by anyone" on activity_comments;
create policy "Comments on viewable activities are viewable"
  on activity_comments for select
  using (
    exists (
      select 1 from activities a
      where a.id = activity_comments.activity_id
        and (
          a.user_id = auth.uid()
          or exists (
            select 1 from follows f
            where f.follower_id = auth.uid()
              and f.following_id = a.user_id
          )
          or exists (
            select 1 from books b
            where b.id = a.book_id
              and b.is_public = true
          )
        )
    )
  );
