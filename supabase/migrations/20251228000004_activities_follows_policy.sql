-- activities: 팔로우한 사용자의 활동을 볼 수 있는 정책
--
-- follows 테이블(20251228000002_create_follows_table.sql)을 참조하기 때문에,
-- 그 테이블이 이미 만들어진 뒤에 실행되어야 한다 (버전 번호가 더 커야 함).

CREATE POLICY "Users can view followed users' activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM follows
      WHERE follows.follower_id = auth.uid()
      AND follows.following_id = activities.user_id
    )
  );
