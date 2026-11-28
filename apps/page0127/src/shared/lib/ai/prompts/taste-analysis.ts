/**
 * 독서 취향 분석 프롬프트
 *
 * 학습 포인트:
 * - AI에게 명확한 역할과 작업 지시
 * - 응답 모양은 프롬프트가 아니라 JSON 스키마(createTasteAnalysisSchema)가 정한다
 * - 규칙마다 이유를 함께 적는다 — 최신 모델은 강조(⚠️·굵게)보다 이유를 알 때 더 잘 따른다
 * - 책 데이터를 구조화하여 전달
 */

/**
 * 독서 취향 분석에 필요한 책 정보 타입
 *
 * score: **이미 5점 만점으로 접힌** 점수를 받는다 (null = 평가 안 함).
 *   DB의 rating(0,1,2,3,4,5,10)은 균일한 척도가 아니라 그대로 쓸 수 없다.
 *   접는 규칙의 단일 출처는 entities/book/model/rating.ts 이고, shared는 entities를
 *   모르므로 성향 타입과 같은 방식으로 **호출부에서 변환해 주입받는다.**
 */
type BookForAnalysis = {
  /**
   * 응답이 근거 책을 가리키는 번호(예: "B3") — 호출부가 붙인다(entities/taste-analysis/model/evidence).
   * 제목 대신 번호로 고르게 해야 지어낸 책이 근거로 들어오지 않는다.
   */
  key: string;
  /**
   * 어느 칸에 넣을지 — 'recent' 요즘 읽은 책, 'lasting' 그 전에 읽은 인생책·5점.
   * 기준의 단일 출처는 entities/taste-analysis/model/bookSelection (shared는 entities를 모르므로
   * 호출부가 붙여 준다). AI 는 날짜를 모르기 때문에 이 칸이 "무엇이 최근인지" 알려 주는 유일한 신호다.
   */
  period: 'recent' | 'lasting';
  title: string;
  author: string | null;
  category: string | null;
  score: number | null;
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

/** 프롬프트에 적는 점수 만점 — 호출부가 이미 이 척도로 접어서 넘긴다 */
const SCORE_MAX = 5;

/**
 * 독서 취향 분석 프롬프트 생성
 */
export function createTasteAnalysisPrompt(
  books: BookForAnalysis[],
  personalityTypes: PersonalityTypeOption[],
  /**
   * 타입별로 요청할 추천 권수.
   * 화면에 노출할 권수보다 크게 잡는다 — 실재하지 않는 책은 서점 대조 단계에서
   * 탈락하므로, 여유분 없이 딱 맞춰 받으면 섹션이 비어 보인다.
   */
  recommendationsPerType: number,
  /**
   * 위 분석 목록 밖에 있는, 이미 책장에 있는 책 "제목 - 저자".
   * AI는 분석용 책(최근 40권+인생책 10권)만 보므로, 이걸 안 주면 읽은 책을 추천한다(2026-11-28 HJ).
   */
  otherShelfBooks: readonly string[] = []
): string {
  // 평가 안 함(score = null)은 높은 점수도 낮은 점수도 아니다 → 두 목록에서 모두 뺀다.
  // 전에는 0점 책이 "낮은 점수를 준 책들"로 모델에 전달돼 취향을 거꾸로 읽혔다.
  const ratedBooks = books.filter(
    (book): book is BookForAnalysis & { score: number } => book.score !== null
  );
  const recentBooks = ratedBooks.filter((book) => book.period === 'recent');
  const lastingBooks = ratedBooks.filter((book) => book.period === 'lasting');
  const highRatedBooks = recentBooks.filter((book) => book.score >= 4);
  // 3점대(3 이상 4 미만) — 전에는 두 칸 어디에도 안 들어가 분석에서 통째로 빠졌다(2026-11-28 HJ)
  const middleRatedBooks = recentBooks.filter(
    (book) => book.score >= 3 && book.score < 4
  );
  const lowRatedBooks = recentBooks.filter((book) => book.score < 3);

  // 책 정보를 텍스트로 변환
  const formatBooks = (bookList: (BookForAnalysis & { score: number })[]) =>
    bookList
      .map(
        (book, idx) =>
          `${idx + 1}. [${book.key}] "${book.title}" - ${book.author}\n   카테고리: ${book.category}\n   별점: ${book.score}/${SCORE_MAX}\n   소개: ${book.description?.substring(0, 200)}...\n   목차: ${book.toc?.substring(0, 300) || '정보 없음'}...`
      )
      .join('\n\n');

  // 예전 인생책·5점 — 요즘 칸이 꽉 찬 사람에게만 있다. 없으면 섹션도 지침도 빼서
  // 책이 적은 사람의 프롬프트는 예전과 같은 모양을 유지한다.
  const lastingSection =
    lastingBooks.length > 0
      ? `
### 오래 남은 책 — 그 전에 읽은 인생책·만점 책 (${lastingBooks.length}권):
${formatBooks(lastingBooks)}
`
      : '';
  const lastingGuide =
    lastingBooks.length > 0
      ? `
- "오래 남은 책"은 오래 이어져 온 뿌리 취향을 확인하는 참고로만 써 주세요. 요즘 책과 결이 다르면 요즘 쪽을 따르고, 그 차이를 취향의 변화로 설명해도 좋아요`
      : '';

  // 제목만 짧게 — 소개·목차를 붙이면 책이 많은 사람의 프롬프트가 크게 불어난다
  const shelfSection =
    otherShelfBooks.length > 0
      ? `
### 이미 책장에 있는 그 밖의 책 (${otherShelfBooks.length}권, 추천 제외용)
${otherShelfBooks.join(' / ')}
`
      : '';

  // 타입 카탈로그를 "이름: 판단 기준" 목록으로 변환
  const personalityTypeList = personalityTypes
    .map((t) => `- "${t.name}": ${t.criteria}`)
    .join('\n');

  return `사용자의 독서 기록을 읽고, 본인도 미처 몰랐던 취향을 찾아 정리해 주세요.

## 분석 데이터

### 요즘 읽은 책 — 최근 완독한 순서

#### 높은 점수를 준 책 (${SCORE_MAX}점 만점 중 4점 이상, ${highRatedBooks.length}권)
${formatBooks(highRatedBooks)}

#### 보통이었던 책 (3점대, ${middleRatedBooks.length}권)
${formatBooks(middleRatedBooks)}

#### 낮은 점수를 준 책 (3점 미만, ${lowRatedBooks.length}권)
${formatBooks(lowRatedBooks)}
${lastingSection}${shelfSection}
## 분석 방법
- 성향 타입과 좋아하는 주제는 "요즘 읽은 책"을 중심으로 판단해 주세요. 지금의 취향을 보여 주는 게 목적이에요${lastingGuide}
- "보통이었던 책"은 끝까지 읽었지만 마음에 깊이 남지는 않은 책이에요. 좋아하는 것과 피하는 것의 경계를 가늠하는 데 써 주세요
- 책 소개와 목차에 담긴 의미를 읽고, 겉으로 드러나지 않는 패턴을 찾아 주세요. 권수나 분류를 세는 통계보다 사용자가 "맞아, 나 이런 사람이지" 하고 알아볼 만한 발견이 더 반가워요
- 추천 이유는 사용자의 독서 패턴과 이어서 설명해 주세요

## 성향 타입
아래 목록에서 가장 잘 맞는 하나를 골라 주세요. 화면이 이 이름으로 그림과 설명을 찾기 때문에, 목록의 이름을 글자 그대로 써야 해요.
${personalityTypeList}

## 근거 책 (evidence)
성향과 좋아하는 주제를 그렇게 판단한 근거가 된 책 3~5권을 골라 주세요. 결과 화면에 "이 책들을 보고 이렇게 읽었어요"로 표지와 함께 나가요.
- book 에는 위 목록의 책 번호(예: "B3")를 그대로 써 주세요. 화면이 이 번호로 실제 책을 찾아서, 목록에 없는 번호는 버려져요
- 가능하면 요즘 읽은 책 중 높은 점수를 준 책에서 골라 주세요
- reason 은 그 책에서 읽어 낸 취향을 40자 안쪽 한 줄로, 명사형으로 끝내 주세요 (예: "일의 현장에서 바로 쓰는 실전 지식을 찾는 시선")
- topics 에는 이 책이 근거가 된 주제를 liked.topics 에 쓴 이름 그대로 1~2개 넣어 주세요. 화면이 이름을 맞춰서 주제와 책을 이어 보여 줘요
- 근거 책들이 liked.topics 의 주제를 고르게 덮도록 골라 주세요

## 추천 도서 (recommendations)
종류마다 ${recommendationsPerType}권씩, 모두 ${recommendationsPerType * 3}권을 추천해 주세요. display_order 는 종류 안에서 1부터 ${recommendationsPerType}까지예요.
- match: 지금 취향에 꼭 맞는 책
- expand: 결은 비슷하지만 새로운 영역으로 한 걸음 넓혀 주는 책
- challenge: 평소와 전혀 다르지만 이 사람이라면 좋아할 만한 책

이미 읽었거나 책장에 담아 둔 책은 추천하지 말아 주세요. 위 "분석 데이터"에 나온 책${otherShelfBooks.length > 0 ? '과 "이미 책장에 있는 그 밖의 책"' : ''}이 모두 여기에 해당해요. 같은 책의 개정판·다른 번역본도 피해 주세요.

추천한 책은 실제 서점 데이터와 대조하고, 찾지 못한 제목은 화면에서 빠져요. 그래서:
- 제목과 저자를 확실히 아는, 지금 한국에서 구할 수 있는 책만 골라 주세요. 조금이라도 헷갈리면 확실히 아는 다른 책으로 바꿔 주세요
- 제목은 표지에 적힌 그대로 써 주세요. 부제·시리즈명·원제를 덧붙이거나 줄이면 대조에 실패해요
- 출간 연도는 상관없어요. 최신간을 억지로 고르지 않아도 돼요
- reason 은 이 사람의 책장과 이어지는 구체적인 이유로 100~150자 정도 써 주세요

## 문체
- personality_description(300~500자)과 reason 은 부드러운 해요체로 따뜻하게 써 주세요
- "당신"은 쓰지 말아 주세요. 한국어 화면에서는 번역투로 읽혀요. 주어를 빼거나 "이 책장에는", "~하는 편이네요"처럼 써 주세요
- 예시 톤: "책장에 사람의 마음을 들여다보는 책이 많네요. 빠르게 많이 읽기보다, 좋았던 한 권을 오래 곱씹는 분입니다."
- 평가하거나 단정하는 말투(~해야 합니다)보다 발견을 건네는 말투가 좋아요`;
}

/**
 * 역할 설명(system) — 서비스와 결과가 어디에 나가는지 알려 준다.
 * "전문가입니다" 같은 역할 이름보다, 누가 읽는 글인지 아는 편이 톤을 잘 맞춘다.
 */
export const TASTE_ANALYSIS_SYSTEM =
  'page0127.은 읽은 책을 책장처럼 쌓아 두는 독서 기록 서비스예요. 사용자의 책장을 읽고 독서 취향을 정리해 주세요. 쓴 글은 사용자 본인이 보는 결과 화면에 그대로 나가요.';

/** 스키마 조각 — 모든 객체는 additionalProperties: false·required 가 있어야 한다(structured outputs 규칙) */
const strictObject = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const stringArray = (description?: string) => ({
  type: 'array',
  items: { type: 'string' },
  ...(description && { description }),
});
const text = (description: string) => ({ type: 'string', description });
/** 좋아하는/피하는 주제·스타일·구조 — 권수는 화면 칸 수에 맞춘다 */
const tasteAxes = (verb: string, [topics, styles, structures]: number[]) =>
  strictObject({
    topics: stringArray(`${verb} 주제 ${topics}개`),
    styles: stringArray(`${verb} 문체·스타일 ${styles}개`),
    structures: stringArray(`${verb} 책의 구성·구조 ${structures}개`),
  });

/**
 * 취향 분석 응답 JSON 스키마 — 응답 모양과 칸별 설명(description)은 여기가 단일 출처다.
 * (예전엔 프롬프트에 JSON 예시를 따로 적었는데, 스키마가 모양을 강제하니 겹쳐서 뺐다)
 *
 * 키 순서가 곧 쓰는 순서다: 화면 진행률(estimateJsonProgress)이 이 순서로 이정표를 센다.
 * personality_type 을 enum 으로 묶어 카탈로그 밖 이름이 오지 않게 한다.
 *
 * @param personalityTypeNames 성향 타입 카탈로그 이름들 (entities 에서 주입)
 */
export function createTasteAnalysisSchema(
  personalityTypeNames: readonly string[]
): Record<string, unknown> {
  return strictObject({
    personality_type: {
      type: 'string',
      enum: [...personalityTypeNames],
      description: '성향 타입 목록에서 고른 이름',
    },
    personality_description: text('성향 설명, 해요체 300~500자'),
    preference_profile: strictObject({
      liked: tasteAxes('좋아하는', [5, 3, 3]),
      disliked: tasteAxes('피하는', [3, 2, 2]),
      patterns: strictObject({
        page_count_preference: text('선호하는 쪽수 범위'),
        author_type: text('선호하는 저자 유형'),
        publication_period: text('선호하는 출판 시기'),
      }),
    }),
    evidence: {
      type: 'array',
      description: '판단의 근거가 된 책 3~5권',
      items: strictObject({
        book: text('분석 데이터의 책 번호 (예: "B3")'),
        reason: text('이 책에서 읽어 낸 취향, 40자 안쪽 명사형 한 줄'),
        topics: stringArray('liked.topics 에 쓴 이름 그대로 1~2개'),
      }),
    },
    recommendations: {
      type: 'array',
      description: '종류마다 같은 권수씩 추천',
      items: strictObject({
        type: { type: 'string', enum: ['match', 'expand', 'challenge'] },
        title: text('표지에 적힌 그대로의 제목'),
        author: text('저자'),
        reason: text('이 책장과 이어지는 추천 이유, 해요체 100~150자'),
        display_order: {
          type: 'integer',
          description: '종류 안에서 1부터 매기는 순서',
        },
      }),
    },
  });
}

/** 취향 분석 응답에서 진행률을 재는 이정표 — 스키마 키 순서와 맞춘다 */
export const TASTE_ANALYSIS_PROGRESS = {
  milestones: [
    ['personality_type', 0.03],
    ['personality_description', 0.08],
    ['preference_profile', 0.3],
    ['evidence', 0.42],
    ['recommendations', 0.55],
  ],
  // 추천 책은 제목 하나가 나올 때마다 막대가 한 칸씩 찬다
  repeatKey: 'title',
  from: 0.55,
  to: 0.98,
} as const;
