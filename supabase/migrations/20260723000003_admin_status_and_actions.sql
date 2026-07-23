-- Admin: 회원 정지 상태 미러 + 관리자 행위 감사 로그
-- 작성일: 2026-07-23

-- 1) profiles: 정지 상태(표시용 미러). 실제 차단은 Supabase Auth 네이티브 ban.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
-- suspended_until: null = 영구(정지 중) 또는 미정지. 값 있으면 그 시각까지 임시 정지.

-- 2) admin_actions: 누가·언제·왜 정지/해제했는지
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,          -- 'suspend' | 'unsuspend'
  reason text,
  duration_days int,             -- null = 영구
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: admin은 service_role로 우회하므로 정책 없이 활성화만(일반 유저 차단)
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
