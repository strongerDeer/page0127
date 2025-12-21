/**
 * 독서 취향 분석 프롬프트
 *
 * 학습 포인트:
 * - AI에게 명확한 역할과 작업 지시
 * - JSON 응답 형식 지정
 * - 책 데이터를 구조화하여 전달
 */

import type { Book } from '@/entities/book/types';

/**
 * 독서 취향 분석 프롬프트 생성
 */
export function createTasteAnalysisPrompt(books: Book[]): string {
  // 별점별로 책 분류
  const highRatedBooks = books.filter((book) => (book.rating ?? 0) >= 4);
  const lowRatedBooks = books.filter(
    (book) => book.rating !== null && book.rating < 3
  );

  // 책 정보를 텍스트로 변환
  const formatBooks = (bookList: Book[]) =>
    bookList
      .map(
        (book, idx) =>
          `${idx + 1}. "${book.title}" - ${book.author}\n   카테고리: ${book.category}\n   별점: ${book.rating}/10\n   소개: ${book.description?.substring(0, 200)}...\n   목차: ${book.toc?.substring(0, 300) || '정보 없음'}...`
      )
      .join('\n\n');

  return `당신은 독서 취향 분석 전문가입니다. 사용자의 독서 기록을 분석하여 깊이 있는 인사이트를 제공해주세요.

## 분석 데이터

### 높은 점수를 준 책들 (4점 이상, ${highRatedBooks.length}권):
${formatBooks(highRatedBooks)}

### 낮은 점수를 준 책들 (3점 미만, ${lowRatedBooks.length}권):
${formatBooks(lowRatedBooks)}

## 분석 요청사항

다음 형식의 JSON으로 응답해주세요:

{
  "personality_type": "성향 타입 (20자 이내, 예: 내면 탐구형 독서가)",
  "personality_description": "성향에 대한 깊이 있는 설명 (300-500자)",
  "preference_profile": {
    "liked": {
      "topics": ["좋아하는 주제 5개"],
      "styles": ["좋아하는 스타일 3개"],
      "structures": ["좋아하는 구조 3개"]
    },
    "disliked": {
      "topics": ["피하는 주제 3개"],
      "styles": ["피하는 스타일 2개"],
      "structures": ["피하는 구조 2개"]
    },
    "patterns": {
      "page_count_preference": "선호 페이지 수 범위",
      "author_type": "선호 저자 유형",
      "publication_period": "선호 출판 시기"
    }
  },
  "recommendations": [
    {
      "type": "match",
      "title": "도서 제목",
      "author": "저자",
      "isbn": "ISBN13",
      "reason": "추천 이유 (100자 내외)",
      "display_order": 1
    },
    // ... match 5권, expand 5권, challenge 5권 (총 15권, 국내도서만)
  ]
}

## 주의사항
- 책 소개와 목차의 **의미**를 분석하여 숨겨진 패턴을 찾아주세요
- 단순 통계가 아닌, 사용자가 모르는 자신의 취향을 발견하게 해주세요
- 추천 도서는 반드시 **한국 출판된 국내도서**만 추천하세요
- ISBN은 정확한 13자리 숫자로 제공하세요
- type은 "match", "expand", "challenge" 중 하나
- display_order는 1부터 시작`;
}
