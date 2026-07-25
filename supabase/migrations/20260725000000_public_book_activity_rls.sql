-- 공개 책의 활동/댓글을 방문자(비로그인 포함)도 조회할 수 있게 한다.
--
-- 배경: 책 상세의 "이 책의 기록" 타임라인은 책의 is_public 설정을 따라 공개된다.
-- 그런데 기존 RLS는 activities를 "본인/팔로워"만, activity_comments를 "로그인 사용자(TO
-- authenticated)"만 SELECT하도록 제한해, 공개 책이라도 방문자에게 빈 목록이 나왔다.
-- 아래 정책을 OR로 추가해 "책이 공개(is_public=true)면 그 책의 활동·댓글은 누구나 조회"를 연다.
-- (activity_likes는 이미 "Anyone can view likes" USING(true)라 별도 조치가 필요 없다.)
--
-- 안전성: 비공개 책은 books RLS(is_public OR 소유자)로 이미 막혀 있고, 아래 정책도
-- is_public=true인 경우에만 SELECT를 허용하므로 비공개 책의 활동/댓글은 새어나가지 않는다.
-- 모든 구문은 idempotent(drop if exists 후 create)하여 재적용·운영 반영도 안전하다.

-- 1) activities: 책이 공개면 그 책의 활동을 누구나 조회
drop policy if exists "Public book activities are viewable by anyone" on activities;
create policy "Public book activities are viewable by anyone"
  on activities for select
  using (
    exists (
      select 1
      from books
      where books.id = activities.book_id
        and books.is_public = true
    )
  );

-- 2) activity_comments: 공개 책 활동의 댓글을 누구나 조회
--    (기존 "TO authenticated USING(true)"에 더해, 비로그인 방문자도 공개 책 댓글을 보게 한다)
drop policy if exists "Public book activity comments are viewable by anyone" on activity_comments;
create policy "Public book activity comments are viewable by anyone"
  on activity_comments for select
  using (
    exists (
      select 1
      from activities a
      join books b on b.id = a.book_id
      where a.id = activity_comments.activity_id
        and b.is_public = true
    )
  );
