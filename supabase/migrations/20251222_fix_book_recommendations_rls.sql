-- book_recommendations 테이블 RLS 정책 수정
-- 작성일: 2025-12-22

-- 1. isbn 컬럼 nullable로 변경 (AI는 제목/저자만 제공)
ALTER TABLE book_recommendations ALTER COLUMN isbn DROP NOT NULL;

-- 2. book_recommendations INSERT 정책 추가
CREATE POLICY "Users can insert recommendations for their own analyses"
  ON book_recommendations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM taste_analyses
      WHERE taste_analyses.id = book_recommendations.taste_analysis_id
      AND taste_analyses.user_id = auth.uid()
    )
  );

-- 3. book_recommendations UPDATE 정책 추가 (알라딘 API 업데이트용)
CREATE POLICY "Users can update recommendations for their own analyses"
  ON book_recommendations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM taste_analyses
      WHERE taste_analyses.id = book_recommendations.taste_analysis_id
      AND taste_analyses.user_id = auth.uid()
    )
  );

-- 4. book_recommendations DELETE 정책 추가 (알라딘에서 못 찾은 책 삭제용)
CREATE POLICY "Users can delete recommendations for their own analyses"
  ON book_recommendations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM taste_analyses
      WHERE taste_analyses.id = book_recommendations.taste_analysis_id
      AND taste_analyses.user_id = auth.uid()
    )
  );
