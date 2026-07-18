/**
 * 히어로 배너 슬라이드 — 편집 카피 자산
 *
 * 밀리의서재 히어로를 실측한 결과를 그대로 따른다:
 * - 메인 카피는 2줄, 각 줄 8~12자 (전체 17~23자)
 * - 서브 카피 18~22자
 * - eyebrow 에 날짜·기간·회차를 박는다 → "누군가 갱신 책임을 지고 있다"는 신호
 * - "당신"을 쓰지 않는다 (밀리도 UI 문구엔 0회)
 *
 * 배너는 편집 산출물이므로 코드가 아니라 이 파일만 고치면 되도록 분리했다.
 */
export type HeroSlide = {
  id: string;
  /** 배너 위 작은 라벨 — 기간·회차·분류 */
  eyebrow: string;
  /** 2줄 메인 카피 */
  lines: [string, string];
  /** 서브 카피 */
  sub: string;
  href: string;
  cta: string;
  /** 배너 배경 (단색 — 그라디언트를 쓰지 않는다) */
  bg: string;
  /** 배너 위 글자색 */
  fg: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'shelf',
    eyebrow: 'page0127',
    lines: ['책장을 보면,', '그 사람이 보인다'],
    sub: '읽은 책을 한 권씩 기록하면, 몰랐던 취향이 보이기 시작합니다.',
    href: '/login',
    cta: '내 책장 만들기',
    bg: '#14294e',
    fg: '#f4f8fd',
  },
  {
    id: 'taste',
    eyebrow: '완독 5권부터',
    lines: ['열 권이면 충분해요', '취향은 이미 쌓였습니다'],
    sub: '책장을 찬찬히 읽고, 다음에 읽을 책까지 골라 드립니다.',
    href: '/login',
    cta: '취향 분석 보기',
    bg: '#1e69cb',
    fg: '#f4f8fd',
  },
  {
    id: 'compatibility',
    eyebrow: '독서 궁합',
    lines: ['두 사람의 책장을', '나란히 놓아볼까요'],
    sub: '겹치는 관심사와 서로 다른 결을 찾아, 건네줄 책까지 고릅니다.',
    href: '/login',
    cta: '궁합 분석하기',
    // 코랄(포인트 컬러)의 딥 톤 — 블루 일색 배너 사이의 리듬
    bg: '#a63d10',
    fg: '#f4f8fd',
  },
  {
    id: 'goal',
    eyebrow: '2026년 하반기',
    lines: ['올해 절반이 지났어요', '남은 여섯 달의 목표'],
    sub: '연간 목표를 세우고, 달력에 완독의 흔적을 남겨 보세요.',
    href: '/login',
    cta: '목표 세우기',
    bg: '#31405f',
    fg: '#f4f8fd',
  },
];
