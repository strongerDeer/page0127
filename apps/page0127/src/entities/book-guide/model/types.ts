/**
 * 읽기 가이드 그림 부품이 받는 데이터 모양 — 타입만.
 *
 * 가이드는 책마다 코드 파일로 만든다(HJ 11/21 결정: 디자인이 책마다 달라질 것).
 * 데이터가 DB 가 아니라 코드에 있으니 런타임 검사(Zod) 대신 TypeScript 가 빌드 때 지킨다.
 * 이 부품(CanvasPeople·BookGuide)은 쓰고 싶은 책만 골라 쓰는 도구다 — 다른 책은 JSX 를 자유롭게 짜도 된다.
 */

/**
 * 관계도 캔버스 폭(px). 인스타 카드(1080) 좌우 여백 100 을 뺀 값이라
 * 피그마 좌표에서 (100, 맨 위) 만 빼면 그대로 옮겨진다.
 */
export const GUIDE_CANVAS_WIDTH = 880;

export type GuideRect = { x: number; y: number; w: number; h?: number };

/**
 * 상자 색 — 디자인 시스템 짝. primary=파랑 채움, green=초록 채움, outline=초록 테두리,
 * white=흰 카드(판 안), line=흰 카드+테두리(판 밖), sunken=회색 카드
 */
export type GuideTone =
  'primary' | 'green' | 'outline' | 'white' | 'line' | 'sunken';

/** 테두리·배경 색 — semantic 토큰 이름(CSS 변수 var(--이름)). hex 를 쓰지 않아 다크 모드가 따라온다 */
export type GuideColor =
  | 'primary'
  | 'guide-green'
  | 'text-strong'
  | 'text-body'
  | 'text-subtle'
  | 'chart-7'
  | 'rank-up'
  | 'line'
  | 'line-soft'
  | 'card'
  | 'sunken'
  | 'accent';

export type GuideBorder = {
  color: GuideColor;
  width: number;
  style?: 'solid' | 'dashed' | 'dotted';
};

/** 기본(Pretendard) / 명조(시스템 글꼴 — 내려받는 파일 없음) */
export type GuideFont = 'sans' | 'serif';

export type GuidePerson = {
  /** 관계선이 가리키는 키 — 같은 관계도 안에서만 유일하면 된다 */
  id: string;
  name: string;
  /** 이름 옆 작은 별명 — "강영두(깨죽이)" 의 깨죽이 */
  alias?: string;
  /** 줄바꿈(\n)은 그대로 보인다. 없으면 이름만 */
  role?: string;
  tone?: GuideTone;
  border?: GuideBorder;
  font?: GuideFont;
  at?: GuideRect;
};

/** 관계 종류 — 선 모양. 실선=인연, 점선=가족, 파선=일 */
export type GuideLinkKind = 'bond' | 'family' | 'work';

export type GuideGroup = {
  /** 관계선이 묶음 전체(회색 판)를 가리킬 때 쓰는 키 */
  id?: string;
  name: string;
  /** 회색 판 자리. 자리 없는 구성원은 판 안에 격자로 채운다 */
  box?: GuideRect;
  cols?: number;
  fill?: GuideColor;
  border?: GuideBorder;
  members: GuidePerson[];
};

export type GuideLink = {
  from: string;
  to: string;
  label?: string;
  kind: GuideLinkKind;
  /**
   * 피그마에서 그린 선 모양 그대로(꺾은선들 + 배지 자리). 없으면 상자 가운데끼리 자동으로 긋는다.
   * lines 가 빈 배열이면 그리지 않는다(다른 관계가 대신 그린 갈래선).
   */
  route?: { lines: [number, number][][]; badge?: [number, number] };
};

export type GuideBackground = {
  color?: GuideColor;
  /** public/ 아래 그림 경로 등 — 그림이 있으면 다크 모드에서도 관계도만 밝게 */
  image?: string;
  fit?: 'cover' | 'contain';
  opacity?: number;
};

export type PeopleSection = {
  type: 'people';
  title: string;
  era?: string;
  /** 큰 칸 중심 인물 1~2명 */
  leads: GuidePerson[];
  groups: GuideGroup[];
  links: GuideLink[];
  /** 범례 이름 바꾸기 — 예: 실선을 "인연" 대신 "기록" */
  legend?: Partial<Record<GuideLinkKind, string>>;
  canvas: {
    /** 없으면 가장 아래 상자에 맞춘다 */
    height?: number;
    font?: GuideFont;
    background?: GuideBackground;
  };
};

export type TimelineSection = {
  type: 'timeline';
  title: string;
  subtitle?: string;
  items: { when: string; title: string; note?: string }[];
};

export type PlacesSection = {
  type: 'places';
  title: string;
  subtitle?: string;
  routes: { label: string; stops: { name: string; note?: string }[] }[];
};

export type BookGuideSection = PeopleSection | TimelineSection | PlacesSection;
