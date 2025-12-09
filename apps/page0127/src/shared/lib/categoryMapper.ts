/**
 * 알라딘 카테고리를 대분류로 매핑하는 유틸리티
 *
 * 학습 포인트:
 * - 알라딘 API는 "국내도서>자기계발>리더십>리더십" 형태로 반환
 * - 너무 세분화되어 있어 통계/필터링에 부적합
 * - 6-10개 대분류로 매핑하여 사용성 개선
 */

/**
 * 대분류 카테고리 목록 (6개)
 */
export const MAIN_CATEGORIES = [
  '컴퓨터/모바일',
  '소설/시/희곡',
  '인문학',
  '에세이',
  '경제/경영',
  '자기계발',
  '과학',
  '예술/대중문화',
  '역사',
  '기타',
] as const;

export type MainCategory = (typeof MAIN_CATEGORIES)[number];

/**
 * 알라딘 카테고리를 대분류로 매핑
 *
 * @param category - 알라딘 카테고리 (예: "국내도서>자기계발>리더십>리더십")
 * @returns 대분류 카테고리 (예: "자기계발")
 *
 * @example
 * mapToMainCategory('국내도서>자기계발>리더십>리더십') // '자기계발'
 * mapToMainCategory('국내도서>소설/시/희곡>소설') // '소설/시/희곡'
 */
export const mapToMainCategory = (category: string | null): MainCategory => {
  if (!category) return '기타';

  // 소문자로 변환하여 대소문자 구분 없이 매칭
  const lowerCategory = category.toLowerCase();

  // 컴퓨터/모바일
  if (
    lowerCategory.includes('컴퓨터') ||
    lowerCategory.includes('모바일') ||
    lowerCategory.includes('프로그래밍') ||
    lowerCategory.includes('it') ||
    lowerCategory.includes('개발')
  ) {
    return '컴퓨터/모바일';
  }

  // 소설/시/희곡
  if (
    lowerCategory.includes('소설') ||
    lowerCategory.includes('시/희곡') ||
    lowerCategory.includes('문학')
  ) {
    return '소설/시/희곡';
  }

  // 인문학
  if (
    lowerCategory.includes('인문') ||
    lowerCategory.includes('철학') ||
    lowerCategory.includes('심리') ||
    lowerCategory.includes('사회')
  ) {
    return '인문학';
  }

  // 에세이
  if (lowerCategory.includes('에세이') || lowerCategory.includes('수필')) {
    return '에세이';
  }

  // 경제/경영
  if (
    lowerCategory.includes('경제') ||
    lowerCategory.includes('경영') ||
    lowerCategory.includes('마케팅') ||
    lowerCategory.includes('비즈니스')
  ) {
    return '경제/경영';
  }

  // 자기계발
  if (
    lowerCategory.includes('자기계발') ||
    lowerCategory.includes('자기관리') ||
    lowerCategory.includes('성공') ||
    lowerCategory.includes('리더십')
  ) {
    return '자기계발';
  }

  // 과학
  if (
    lowerCategory.includes('과학') ||
    lowerCategory.includes('수학') ||
    lowerCategory.includes('기술')
  ) {
    return '과학';
  }

  // 예술/대중문화
  if (
    lowerCategory.includes('예술') ||
    lowerCategory.includes('미술') ||
    lowerCategory.includes('음악') ||
    lowerCategory.includes('영화') ||
    lowerCategory.includes('디자인') ||
    lowerCategory.includes('대중문화')
  ) {
    return '예술/대중문화';
  }

  // 역사
  if (lowerCategory.includes('역사')) {
    return '역사';
  }

  // 기타
  return '기타';
};
