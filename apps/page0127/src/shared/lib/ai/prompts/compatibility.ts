/**
 * 독서 궁합 분석 프롬프트
 *
 * 학습 포인트:
 * - 두 사용자의 책 목록을 나란히 제공하고 비교 분석을 요청
 * - 추천 도서는 AI가 지어내지 않고 "상대방 책 목록에서 고르게" 제한
 *   → 서버에서 실제 book 레코드와 제목 매칭이 가능해진다 (표지·ISBN 확보)
 * - 궁합 타입명은 프롬프트에 없다 — 점수 구간으로 서버가 결정 (일관성)
 * - 응답 모양은 JSON 스키마(COMPATIBILITY_SCHEMA)가 정하고, 규칙마다 이유를 함께 적는다
 */

/**
 * 궁합 분석에 필요한 책 정보 타입
 *
 * score: **이미 5점 만점으로 접힌** 점수를 받는다 (null = 평가 안 함).
 *   DB의 rating(0,1,2,3,4,5,10)은 균일한 척도가 아니라 그대로 쓸 수 없다.
 *   접는 규칙의 단일 출처는 entities/book/model/rating.ts 이고, shared는 entities를
 *   모르므로 **호출부에서 변환해 주입받는다.**
 */
type BookForCompatibility = {
  title: string;
  author: string | null;
  category: string | null;
  score: number | null;
};

type CompatibilityPromptInput = {
  /** 이름·닉네임 없이 책 정보만 전달한다. */
  user1Books: BookForCompatibility[];
  user2Books: BookForCompatibility[];
};

/** 프롬프트에 적는 점수 만점 — 호출부가 이미 이 척도로 접어서 넘긴다 */
const SCORE_MAX = 5;

/**
 * 독서 궁합 분석 프롬프트 생성
 */
export function createCompatibilityPrompt({
  user1Books,
  user2Books,
}: CompatibilityPromptInput): string {
  const formatBooks = (books: BookForCompatibility[]) =>
    books
      .map(
        (book, idx) =>
          `${idx + 1}. "${book.title}" - ${book.author ?? '저자 미상'} / ${book.category ?? '카테고리 없음'} / 별점 ${book.score === null ? '평가 안 함' : `${book.score}/${SCORE_MAX}`}`
      )
      .join('\n');

  return `두 사람의 완독 목록을 나란히 읽고, 독서 취향이 얼마나 잘 맞는지(독서 케미) 정리해 주세요.

## 분석 데이터

### user1 (${user1Books.length}권)
${formatBooks(user1Books)}

### user2 (${user2Books.length}권)
${formatBooks(user2Books)}

## 점수 매기기 (compatibility_score, 0~100)
- 공통 분류·주제의 비중, 별점을 주는 방식이 닮았는지, 독서 스타일(깊이·폭)의 결을 함께 봐 주세요
- 겹치는 책이 적어도 취향의 결이 닮았다면 점수를 깎지 않아도 돼요. 같은 책을 읽었는지보다 같은 결을 좋아하는지가 케미예요
- 아주 낮거나(0~10) 아주 높은(95~100) 점수는 근거가 뚜렷할 때만 써 주세요. 결과가 상대에게 공유될 수 있어서 극단적인 점수는 상처가 되거나 과장으로 읽혀요
- rating_similarity 는 별점 주는 방식이 닮은 정도를 0.0~1.0 으로 적어 주세요

## 서로에게 권할 책
recommendations_for_user1 은 user2의 목록에서, recommendations_for_user2 는 user1의 목록에서 3권씩 골라 주세요. 화면이 제목으로 상대 책장의 실제 책을 찾아 표지와 함께 보여 줘요. 그래서:
- 상대 목록에 실제로 있는 책만 골라 주세요. 목록에 없는 책은 찾지 못해 버려져요
- title 은 목록의 표기를 한 글자도 바꾸지 말고 그대로 써 주세요
- 두 사람의 목록에 모두 있는 책은 받는 사람이 이미 읽은 책이니 추천하지 마세요. 상대만 읽은 책이 3권보다 적으면 그만큼만 추천해도 돼요
- 상대가 높은 별점을 준 책 중에서, 받는 사람의 취향과 이어지는 책을 골라 주세요
- reason 은 받는 사람에게 이 책을 권하는 이유로 80~120자 정도 써 주세요

## 문체
- compatibility_description(300~500자)과 reason 은 부드럽고 따뜻한 해요체로 써 주세요 (예: "~해요", "~네요", "~일 거예요")
- 결과 문장에서는 "궁합" 대신 "케미"라고 써 주세요. 서비스 화면의 이름이 "독서 케미"예요
- 실명·닉네임을 추정하거나 만들어 내지 마세요. 두 사람을 함께 가리킬 때는 "두 분"이라고 써 주세요
- "당신"은 쓰지 말아 주세요. 한국어 화면에서는 번역투로 읽혀요. 주어를 빼거나 user1·user2로 나눠 써 주세요
- 차이점은 단점이 아니라 서로를 넓혀 줄 부분으로 써 주세요
- 단순 통계 나열보다, 두 사람이 몰랐던 연결고리를 발견하게 해 주세요`;
}

/** 역할 설명(system) — 결과가 누구에게 어떻게 보이는지 알려 준다 */
export const COMPATIBILITY_SYSTEM =
  'page0127.은 읽은 책을 책장처럼 쌓아 두는 독서 기록 서비스예요. 두 회원의 책장을 비교해 독서 케미를 정리해 주세요. 쓴 글은 분석을 요청한 회원이 보고, 원하면 상대에게도 공유돼요.';

const strictObject = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const stringArray = (description: string) => ({
  type: 'array',
  items: { type: 'string' },
  description,
});
const text = (description: string) => ({ type: 'string', description });
const recommendationList = (from: string) => ({
  type: 'array',
  description: `${from}의 목록에서 고른 3권`,
  items: strictObject({
    title: text('목록의 표기 그대로의 제목'),
    author: text('저자'),
    reason: text('받는 사람에게 권하는 이유, 해요체 80~120자'),
  }),
});

/**
 * 독서 케미 응답 JSON 스키마 — 응답 모양과 칸별 설명(description)은 여기가 단일 출처다.
 * 키 순서가 곧 쓰는 순서다: 진행률(COMPATIBILITY_PROGRESS)이 이 순서로 이정표를 센다.
 * (점수 0~100 범위는 스키마로 강제할 수 없어 라우트가 잘라 낸다)
 */
export const COMPATIBILITY_SCHEMA: Record<string, unknown> = strictObject({
  compatibility_score: { type: 'integer', description: '0~100 사이 정수' },
  compatibility_description: text('케미 설명, 해요체 300~500자'),
  similarity_analysis: strictObject({
    common_interests: stringArray('공통 관심 주제, 최대 5개'),
    reading_patterns: strictObject({
      user1: text('user1의 독서 패턴 한 문장 (예: 마음을 돌보는 에세이형)'),
      user2: text('user2의 독서 패턴 한 문장'),
    }),
    rating_similarity: {
      type: 'number',
      description: '별점 주는 방식이 닮은 정도, 0.0~1.0',
    },
    commonalities: stringArray('두 사람의 공통점 2~4개'),
    differences: stringArray('두 사람의 차이점 2~4개'),
  }),
  recommendations_for_user1: recommendationList('user2'),
  recommendations_for_user2: recommendationList('user1'),
});

/** 케미 응답에서 진행률을 재는 이정표 — 스키마 키 순서와 맞춘다 */
export const COMPATIBILITY_PROGRESS = {
  milestones: [
    ['compatibility_score', 0.03],
    ['compatibility_description', 0.08],
    ['similarity_analysis', 0.4],
    ['recommendations_for_user1', 0.6],
  ],
  // 상호 추천은 두 사람 3권씩, 제목 6개
  repeatKey: 'title',
  from: 0.6,
  to: 0.98,
} as const;
