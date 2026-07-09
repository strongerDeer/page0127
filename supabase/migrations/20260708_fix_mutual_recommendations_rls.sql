-- mutual_recommendations 테이블 RLS 정책 보완
-- 작성일: 2026-07-08
-- 배경: 20251221 마이그레이션에서 SELECT 정책만 생성되어 INSERT가 RLS에 막힘
--       (book_recommendations의 20251222 수정과 동일한 패턴)

-- 1. isbn 컬럼 nullable로 변경
--    (추천 도서는 상대방 책장에서 고르지만, books.isbn이 없는 책도 있을 수 있음)
ALTER TABLE mutual_recommendations ALTER COLUMN isbn DROP NOT NULL;

-- 2. INSERT 정책 추가 — 본인이 속한 궁합 분석에만 추천을 저장할 수 있다
CREATE POLICY "Users can insert recommendations for their compatibility"
  ON mutual_recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM compatibility_analyses ca
      WHERE ca.id = mutual_recommendations.compatibility_analysis_id
      AND (ca.user_id_1 = auth.uid() OR ca.user_id_2 = auth.uid())
    )
  );
