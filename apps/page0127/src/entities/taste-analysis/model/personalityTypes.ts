/**
 * 독서 성향 타입 카탈로그
 *
 * 학습 포인트:
 * - AI가 자유 생성하던 personality_type을 고정 카탈로그에서 고르게 해
 *   결과의 일관성(브랜드 언어)과 재사용성(뱃지·궁합·공유)을 확보한다
 * - "~하는 사람" 시리즈 — 브랜드 카피("책장을 보면, 그 사람이 보인다")와 톤 통일
 */

export type ReadingPersonalityType = {
  /** 타입 이름 — personality_type 컬럼에 그대로 저장된다 */
  name: string;
  /** AI가 이 타입을 고르는 판단 기준 */
  criteria: string;
  /**
   * 타입 배지 색상 (브랜드 스카이블루 램프 + 카테고리 구분용 chart 컬러에서만 선택)
   * app/globals.css의 --chart-1~7, 브랜드 팔레트 5단계 참조 — Tailwind 기본 팔레트 사용 금지
   * (파스텔 그라디언트는 실서비스에 없는 "AI 랜딩" 신호라 PageContainer.tsx에서도 이미 폐기함)
   */
  color: string;
};

export const READING_PERSONALITY_TYPES: ReadingPersonalityType[] = [
  {
    name: '마음의 결을 읽는 사람',
    criteria: '심리·에세이 등 사람의 감정과 내면을 다루는 책 비중이 높음',
    color: '#7a5cf0', // 바이올렛 (chart-7) — 내면·감정
  },
  {
    name: '이야기에 사는 사람',
    criteria: '소설·서사 중심, 인물과 이야기에 깊이 몰입하는 독서',
    color: '#1e69cb', // 브랜드 진한 블루 — 가장 중심이 되는 톤
  },
  {
    name: '세상을 넓히는 사람',
    criteria: '과학·역사·사회 등 교양서 중심, 지적 호기심이 넓게 뻗는 독서',
    color: '#74b0ff', // 라이트 스카이 (chart-3) — 개방감
  },
  {
    name: '한 우물을 깊이 파는 사람',
    criteria: '특정 분야·주제에 집중된 책장, 같은 영역을 파고드는 정독형',
    color: '#0455bf', // 가장 진한 남색 — 깊이·집중
  },
  {
    name: '쉬지 않고 페이지를 넘기는 사람',
    criteria: '장르를 가리지 않는 다독형, 완독 권수가 많고 스펙트럼이 넓음',
    color: '#438ef2', // 밝은 블루 — 속도감
  },
  {
    name: '좋은 문장을 오래 곱씹는 사람',
    criteria: '문체·문장 중심의 취향, 높은 별점이 소수의 책에 집중됨',
    color: '#5b6b8c', // 슬레이트 네이비 (chart-5) — 차분함·여운
  },
  {
    name: '내일의 나를 준비하는 사람',
    criteria: '자기계발·실용·커리어 등 성장을 위한 책 비중이 높음',
    color: '#2d78db', // 브랜드 블루 램프 — 전진하는 느낌
  },
  {
    name: '위로를 수집하는 사람',
    criteria: '힐링 에세이·명상·따뜻한 이야기 등 위로와 회복을 찾는 독서',
    color: '#14b8a6', // 틸 (chart-6) — 유일한 온기 있는 톤, 편안함
  },
];

/** 기본 색상 — 카탈로그에 없는 타입(AI 드리프트)이 오면 이걸로 대체 (text-subtle과 동일) */
const DEFAULT_COLOR = '#66779a';

/** 성향 타입 이름으로 배지 색상을 찾는다 */
export const getPersonalityColor = (name: string): string =>
  READING_PERSONALITY_TYPES.find((t) => t.name === name)?.color ??
  DEFAULT_COLOR;
