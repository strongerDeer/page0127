/**
 * 독서 궁합 분석 프롬프트
 *
 * 학습 포인트:
 * - 두 사용자의 책 목록을 나란히 제공하고 비교 분석을 요청
 * - 추천 도서는 AI가 지어내지 않고 "상대방 책 목록에서 고르게" 제한
 *   → 서버에서 실제 book 레코드와 제목 매칭이 가능해진다 (표지·ISBN 확보)
 * - 궁합 타입명은 프롬프트에 없다 — 점수 구간으로 서버가 결정 (일관성)
 */

/**
 * 궁합 분석에 필요한 책 정보 타입
 */
type BookForCompatibility = {
  title: string;
  author: string | null;
  category: string | null;
  rating: number | null;
};

type CompatibilityPromptInput = {
  /** 첫 번째 사용자 (분석을 요청한 사람) */
  user1: { name: string; books: BookForCompatibility[] };
  /** 두 번째 사용자 (공개 서재의 주인) */
  user2: { name: string; books: BookForCompatibility[] };
};

/**
 * 독서 궁합 분석 프롬프트 생성
 */
export function createCompatibilityPrompt({
  user1,
  user2,
}: CompatibilityPromptInput): string {
  const formatBooks = (books: BookForCompatibility[]) =>
    books
      .map(
        (book, idx) =>
          `${idx + 1}. "${book.title}" - ${book.author ?? '저자 미상'} / ${book.category ?? '카테고리 없음'} / 별점 ${book.rating}/10`
      )
      .join('\n');

  return `당신은 두 사람의 독서 취향을 비교 분석하는 전문가입니다. 두 사람의 완독 목록을 바탕으로 독서 궁합을 분석해주세요.

## 분석 데이터

### user1 — ${user1.name} (${user1.books.length}권):
${formatBooks(user1.books)}

### user2 — ${user2.name} (${user2.books.length}권):
${formatBooks(user2.books)}

## 응답 형식

다음 형식의 JSON으로 응답해주세요:

{
  "compatibility_score": 0-100 사이 정수,
  "compatibility_description": "궁합에 대한 설명 (300-500자)",
  "similarity_analysis": {
    "common_interests": ["공통 관심 주제 (최대 5개)"],
    "reading_patterns": {
      "user1": "user1의 독서 패턴 한 문장 (예: 마음을 돌보는 에세이형)",
      "user2": "user2의 독서 패턴 한 문장"
    },
    "rating_similarity": 0.0-1.0 사이 숫자 (별점 주는 방식의 유사도),
    "commonalities": ["두 사람의 공통점 2-4개"],
    "differences": ["두 사람의 차이점 2-4개"]
  },
  "recommendations_for_user1": [
    {
      "title": "user2의 책 목록에 있는 제목을 표기 그대로",
      "author": "저자명",
      "reason": "user1에게 이 책을 권하는 이유 (80-120자)"
    }
    // 정확히 3권
  ],
  "recommendations_for_user2": [
    // user1의 책 목록에서 정확히 3권, 같은 형식
  ]
}

## 점수 산정 기준
- 공통 카테고리·주제의 비중, 별점을 주는 패턴의 유사성, 독서 스타일(깊이/폭)의 결을 종합해주세요
- 겹치는 책이 적어도 취향의 결이 닮았다면 점수를 깎지 마세요
- 극단적인 점수(0-10, 95-100)는 근거가 뚜렷할 때만 사용하세요

## 추천 도서 지침 ⚠️ 매우 중요
- recommendations_for_user1은 **반드시 user2의 책 목록에 실제로 있는 책**에서만 고르세요
- recommendations_for_user2는 **반드시 user1의 책 목록에 실제로 있는 책**에서만 고르세요
- title은 목록의 표기를 한 글자도 바꾸지 말고 그대로 쓰세요 (시스템이 제목으로 원본 책을 찾습니다)
- 상대방이 높은 별점을 준 책 중에서, 받는 사람의 취향과 이어지는 책을 고르세요

## 문체 지침
- compatibility_description과 reason은 부드럽고 따뜻한 해요체로 써주세요 (예: "~해요", "~네요", "~일 거예요")
- 두 사람을 지칭할 때는 이름 뒤에 "님"을 붙여주세요
- 차이점은 단점이 아니라 "서로를 넓혀줄 부분"으로 표현해주세요
- 사용자가 몰랐던 연결고리를 발견하게 해주세요 — 단순 통계 나열은 피해주세요`;
}
