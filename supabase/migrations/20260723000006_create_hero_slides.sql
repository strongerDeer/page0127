-- 메인 히어로 배너 슬라이드 — admin에서 관리, 랜딩이 공개로 읽음
-- 작성일: 2026-07-23

CREATE TABLE IF NOT EXISTS hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow    text NOT NULL DEFAULT '',
  line1      text NOT NULL,
  line2      text NOT NULL,
  sub        text NOT NULL DEFAULT '',
  href       text NOT NULL,
  cta        text NOT NULL,
  bg         text NOT NULL,
  fg         text NOT NULL,
  sort_order int  NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hero_slides_active_order_idx
  ON hero_slides (is_active, sort_order);

-- RLS: 배너는 공개 콘텐츠. 누구나 '켜진' 슬라이드만 읽는다.
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read active slides"
  ON hero_slides FOR SELECT
  USING (is_active = true);
-- 쓰기 정책 없음 → 일반/anon 키로는 불가. admin은 service_role로 관리.

-- 현재 코드의 HERO_SLIDES 4개를 그대로 seed (배포 후에도 랜딩 동일)
INSERT INTO hero_slides (eyebrow, line1, line2, sub, href, cta, bg, fg, sort_order) VALUES
  ('page0127', '책장을 보면,', '그 사람이 보인다',
   '읽은 책을 한 권씩 기록하면, 몰랐던 취향이 보이기 시작합니다.', '/login', '내 책장 만들기', '#14294e', '#f4f8fd', 0),
  ('완독 5권부터', '열 권이면 충분해요', '취향은 이미 쌓였습니다',
   '책장을 찬찬히 읽고, 다음에 읽을 책까지 골라 드립니다.', '/login', '취향 분석 보기', '#1e69cb', '#f4f8fd', 1),
  ('독서 궁합', '두 사람의 책장을', '나란히 놓아볼까요',
   '겹치는 관심사와 서로 다른 결을 찾아, 건네줄 책까지 고릅니다.', '/login', '궁합 분석하기', '#a63d10', '#f4f8fd', 2),
  ('2026년 하반기', '올해 절반이 지났어요', '남은 여섯 달의 목표',
   '연간 목표를 세우고, 달력에 완독의 흔적을 남겨 보세요.', '/login', '목표 세우기', '#31405f', '#f4f8fd', 3);
