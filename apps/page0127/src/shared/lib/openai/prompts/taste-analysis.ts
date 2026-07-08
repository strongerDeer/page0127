/**
 * 독서 취향 분석 프롬프트
 *
 * 학습 포인트:
 * - AI에게 명확한 역할과 작업 지시
 * - JSON 응답 형식 지정
 * - 책 데이터를 구조화하여 전달
 */

/**
 * 독서 취향 분석에 필요한 책 정보 타입
 */
type BookForAnalysis = {
  title: string;
  author: string | null;
  category: string | null;
  rating: number | null;
  description: string | null;
  toc: string | null;
};

/**
 * 성향 타입 선택지 (shared는 entities를 모르므로 호출부에서 주입받는다)
 */
type PersonalityTypeOption = {
  name: string;
  criteria: string;
};

/**
 * 독서 취향 분석 프롬프트 생성
 */
export function createTasteAnalysisPrompt(
  books: BookForAnalysis[],
  personalityTypes: PersonalityTypeOption[]
): string {
  // 별점별로 책 분류
  const highRatedBooks = books.filter((book) => (book.rating ?? 0) >= 4);
  const lowRatedBooks = books.filter(
    (book) => book.rating !== null && book.rating < 3
  );

  // 책 정보를 텍스트로 변환
  const formatBooks = (bookList: BookForAnalysis[]) =>
    bookList
      .map(
        (book, idx) =>
          `${idx + 1}. "${book.title}" - ${book.author}\n   카테고리: ${book.category}\n   별점: ${book.rating}/10\n   소개: ${book.description?.substring(0, 200)}...\n   목차: ${book.toc?.substring(0, 300) || '정보 없음'}...`
      )
      .join('\n\n');

  // 타입 카탈로그를 "이름: 판단 기준" 목록으로 변환
  const personalityTypeList = personalityTypes
    .map((t) => `- "${t.name}": ${t.criteria}`)
    .join('\n');

  return `당신은 독서 취향 분석 전문가입니다. 사용자의 독서 기록을 분석하여 깊이 있는 인사이트를 제공해주세요.

## 분석 데이터

### 높은 점수를 준 책들 (4점 이상, ${highRatedBooks.length}권):
${formatBooks(highRatedBooks)}

### 낮은 점수를 준 책들 (3점 미만, ${lowRatedBooks.length}권):
${formatBooks(lowRatedBooks)}

## 분석 요청사항

다음 형식의 JSON으로 응답해주세요:

{
  "personality_type": "아래 [성향 타입 목록]에서 가장 잘 맞는 것 하나를 이름 그대로 사용",
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
      "title": "책 제목 (실제 존재하는 한국 도서)",
      "author": "저자명",
      "reason": "추천 이유 (왜 이 책이 사용자의 취향에 맞는지 구체적으로 설명)",
      "display_order": 1
    }
    // ... match 5권, expand 5권, challenge 5권 (총 15권)
  ]
}

## 추천 도서 생성 지침 ⚠️ 매우 중요
- **반드시 실제로 존재하는 한국 출판 도서**만 추천하세요
- 제목과 저자를 정확하게 기재하세요 (오타 금지)
- 각 타입별로 정확히 5권씩 추천 (총 15권)
  - type: "match" - 기존 취향에 완벽히 맞는 책 5권
  - type: "expand" - 비슷하지만 새로운 영역 5권
  - type: "challenge" - 전혀 다르지만 좋아할 만한 책 5권
- display_order는 각 타입 내에서 1부터 5까지
- reason은 구체적이고 개인화된 추천 이유 (100-150자)

## 성향 타입 목록 ⚠️ 매우 중요
personality_type은 반드시 아래 목록 중 하나를 **이름 그대로(글자 하나 바꾸지 말 것)** 선택하세요:
${personalityTypeList}

## 분석 지침
- 책 소개와 목차의 **의미**를 깊이 분석하여 숨겨진 패턴을 찾아주세요
- 단순 통계가 아닌, 사용자가 모르는 자신의 취향을 발견하게 해주세요
- 추천 이유는 사용자의 독서 패턴과 연결하여 설명하세요

## 문체 지침
- personality_description과 reason은 **부드러운 해요체**로, 사용자를 "당신"으로 부르며 따뜻하게 말해주세요
- 예시 톤: "당신의 책장에는 사람의 마음을 들여다보는 책이 많아요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분이네요."
- 평가하거나 단정하는 말투(~입니다, ~해야 합니다)보다 발견을 건네는 말투를 사용하세요`;
}
