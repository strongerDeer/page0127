-- 기념일 표지: 홈 책 표지(앞표지)와 띠지를 어드민 배너에서 기간별로 갈아입힌다.
-- 작성일: 2026-11-17
--
-- 종류 칸(belt_style / cover_style)을 따로 두는 이유:
--   null 이 "기본"을 뜻하게 하면 '값을 비운 것'과 '기본을 고른 것'을 구분할 수 없다.
--   종류를 명시하면 TS 에서도 판별 유니온으로 다루기 쉽다.
--
-- 기존 행은 지금처럼 띠지 문구를 보여 주므로 belt_style 기본값을 'custom' 으로 둔다.
-- 표지는 지금까지 늘 기본(파란 표지)이었으므로 cover_style 기본값은 'default'.

ALTER TABLE hero_slides
  ADD COLUMN IF NOT EXISTS belt_style  text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS cover_style text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS cover_bg    text,
  ADD COLUMN IF NOT EXISTS cover_fg    text,
  ADD COLUMN IF NOT EXISTS cover_title text,
  ADD COLUMN IF NOT EXISTS show_number boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS art_url     text,
  ADD COLUMN IF NOT EXISTS art_x       real NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS art_y       real NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS art_w       real NOT NULL DEFAULT 40;

ALTER TABLE hero_slides DROP CONSTRAINT IF EXISTS hero_slides_belt_style_check;
ALTER TABLE hero_slides ADD CONSTRAINT hero_slides_belt_style_check
  CHECK (belt_style IN ('default', 'custom'));

ALTER TABLE hero_slides DROP CONSTRAINT IF EXISTS hero_slides_cover_style_check;
ALTER TABLE hero_slides ADD CONSTRAINT hero_slides_cover_style_check
  CHECK (cover_style IN ('default', 'custom'));

-- 위치는 표지 기준 %(그림 가운데 점). 크기는 표지 너비 대비 %, LCP 보호를 위해 60% 까지.
ALTER TABLE hero_slides DROP CONSTRAINT IF EXISTS hero_slides_art_range_check;
ALTER TABLE hero_slides ADD CONSTRAINT hero_slides_art_range_check
  CHECK (art_x BETWEEN 0 AND 100 AND art_y BETWEEN 0 AND 100 AND art_w BETWEEN 10 AND 60);

COMMENT ON COLUMN hero_slides.belt_style IS
  'default=기본 띠지 문구, custom=이 행의 eyebrow/line1/line2/sub 와 bg/fg 색';
COMMENT ON COLUMN hero_slides.cover_style IS
  'default=기본 파란 표지, custom=cover_bg/cover_fg/cover_title/art_* 로 갈아입힌 표지';
COMMENT ON COLUMN hero_slides.art_url IS 'banner-art 버킷 공개 URL (브라우저에서 600px WEBP 로 줄여 올림)';

-- 기존 행의 bg/fg 는 어드민 카드 배경으로만 쓰였다. 이제 '직접 띠지' 색이 되므로
-- 지금 운영 띠지와 같은 크림/남색으로 맞춰 화면이 바뀌지 않게 한다.
UPDATE hero_slides SET bg = '#f6efe2', fg = '#14294e'
  WHERE belt_style = 'custom';

-- 그림 업로드 버킷: 공개 읽기, 쓰기 정책 없음(서버 액션이 service role 로만 올림).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banner-art', 'banner-art', true, 1048576, ARRAY['image/webp', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read for banner art'
  ) THEN
    CREATE POLICY "Public read for banner art" ON storage.objects
      FOR SELECT USING (bucket_id = 'banner-art');
  END IF;
END $$;
