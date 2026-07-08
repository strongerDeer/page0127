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
};

export const READING_PERSONALITY_TYPES: ReadingPersonalityType[] = [
  {
    name: '마음의 결을 읽는 사람',
    criteria: '심리·에세이 등 사람의 감정과 내면을 다루는 책 비중이 높음',
  },
  {
    name: '이야기에 사는 사람',
    criteria: '소설·서사 중심, 인물과 이야기에 깊이 몰입하는 독서',
  },
  {
    name: '세상을 넓히는 사람',
    criteria: '과학·역사·사회 등 교양서 중심, 지적 호기심이 넓게 뻗는 독서',
  },
  {
    name: '한 우물을 깊이 파는 사람',
    criteria: '특정 분야·주제에 집중된 책장, 같은 영역을 파고드는 정독형',
  },
  {
    name: '쉬지 않고 페이지를 넘기는 사람',
    criteria: '장르를 가리지 않는 다독형, 완독 권수가 많고 스펙트럼이 넓음',
  },
  {
    name: '좋은 문장을 오래 곱씹는 사람',
    criteria: '문체·문장 중심의 취향, 높은 별점이 소수의 책에 집중됨',
  },
  {
    name: '내일의 나를 준비하는 사람',
    criteria: '자기계발·실용·커리어 등 성장을 위한 책 비중이 높음',
  },
  {
    name: '위로를 수집하는 사람',
    criteria: '힐링 에세이·명상·따뜻한 이야기 등 위로와 회복을 찾는 독서',
  },
];
