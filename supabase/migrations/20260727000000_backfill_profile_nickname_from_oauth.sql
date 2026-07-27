-- 기존 계정의 profiles.nickname 을 OAuth 메타데이터로 한 번 채운다
-- 작성일: 2026-07-27
--
-- 배경:
--   프로필 생성(upsertProfile)이 id·email·username 만 써 왔다. Google 로그인이
--   auth.users.raw_user_meta_data 에 이름을 넣어 주는데도 아무도 읽지 않아
--   모든 계정의 nickname 이 NULL 이었고, 사용자 검색·알림에서 '익명'으로 보였다.
--   앱 쪽은 신규 가입 시 초기값을 넣도록 고쳤으므로, 이미 가입한 계정만 여기서 메운다.
--
-- photo_url 을 함께 채우지 않는 이유:
--   프로필 설정의 '이미지 제거'가 photo_url 을 NULL 로 만든다. 즉 NULL 은
--   "한 번도 설정 안 함"과 "일부러 지움"을 구분하지 못한다. 지운 사진을 되살리는
--   쪽이 더 나쁜 오작동이라 건드리지 않는다.
--   반면 nickname 은 빈 값이 저장되는 경로가 없어(updateProfileAction 은 빈
--   문자열을 아예 쓰지 않는다) NULL 이면 확실히 "미설정"이다.

UPDATE profiles p
SET
  nickname = COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), '')
  ),
  updated_at = now()
FROM auth.users u
WHERE
  p.id = u.id
  -- 이미 닉네임이 있는 사용자는 절대 덮지 않는다
  AND (p.nickname IS NULL OR TRIM(p.nickname) = '')
  -- 메타데이터에 쓸 만한 이름이 있을 때만
  AND COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), '')
  ) IS NOT NULL;

-- 메타데이터에 이름이 없는 계정은 여전히 nickname 이 NULL 이다.
-- 이건 정상이다 — 화면은 displayName 모듈이 username 으로 대체해 보여준다.
