-- 보안 점검 후속 (2026-11-24) — 결과·알림은 서버만 쓰고, 책 표지 버킷에 크기·형식 제한을 건다
--
-- ⚠️ 순서: 코드 PR(#507, 이 세 테이블 INSERT 를 service_role 로 바꿈)이 운영에 배포된 **뒤에** push 한다.
--    먼저 push 하면 배포 전 코드는 사용자 키로 INSERT 하다 정책이 없어 실패한다
--    (팔로우·댓글·좋아요 알림이 안 생기고, 케미 분석은 저장 실패 500).
--
-- 왜 정책을 지우나(클라이언트를 믿지 않기):
--   anon 키는 브라우저에 공개돼 있어서, 로그인한 사람은 앱을 거치지 않고 Supabase REST 를 직접
--   부를 수 있다. 그러면 Next 의 /api 레이트 리밋도, 라우트의 "실제로 팔로우했나" 확인도 건너뛴다.
--   service_role 은 RLS 를 우회하므로, 사용자 INSERT 정책을 지워도 서버 저장은 그대로 된다.
--   SELECT·UPDATE·DELETE 정책(읽음 표시, 내 알림 지우기, 보낸 알림 회수)은 그대로 둔다.

-- 1. 알림: 실제 팔로우·댓글·좋아요 없이 아무에게나 가짜 알림을 무제한 넣을 수 있었다
drop policy if exists "Users can create notifications as themselves" on public.notifications;

-- 2. 케미 결과·상호 추천: 두 사람 중 한 명이 AI 를 거치지 않고 점수·설명·추천을 직접 써 넣어
--    상대에게 보여 줄 수 있었다(릴스의 "결제 성공 위조"와 같은 모양)
drop policy if exists "Users can insert compatibility analyses involving them" on public.compatibility_analyses;
drop policy if exists "Users can insert recommendations for their compatibility" on public.mutual_recommendations;

-- 3. 책 표지 버킷: 직접 등록 표지는 브라우저가 book-covers/manual/{uid}/ 로 바로 올린다.
--    정책은 경로·확장자만 보고, 5MB·이미지 검사는 브라우저(uploadManualCover.ts)에만 있었다 →
--    Storage API 를 직접 부르면 큰 파일이나 이미지가 아닌 파일을 공개 버킷에 올릴 수 있었다.
--    프로필 버킷(20261023000000)과 같은 방식으로 버킷에서 막는다.
--    5MB = MAX_MANUAL_COVER_BYTES. 백필 스크립트(image/jpeg)와 YES24 표지·책등도 이 범위 안이다.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'book-covers';
