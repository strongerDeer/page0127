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
 *
 * ⚠️ 이건 **폴백**이다. `hero_slides` 테이블에 켜진 슬라이드가 있으면 그쪽이 이긴다
 * (`entities/banner/api/getActiveHeroSlides`). DB 슬라이드의 카피는 어드민에서 고친다.
 */
import {
  TASTE_ANALYSIS_BOOK_LABEL,
  TASTE_ANALYSIS_MIN_BOOKS,
} from '@/entities/taste-analysis/model/analysisGate';

import type { HeroSlide } from '@/entities/banner/types';

// HeroSlide 타입은 entities/banner로 이동했다 (FSD: widget·feature가 공용으로 import).
// 기존 import 경로(@/widgets/landing/model/heroSlides)를 깨지 않도록 재export한다.
export type { HeroSlide };

/**
 * 슬라이드를 **호출 시점 기준으로** 만든다.
 *
 * 상수 배열이 아니라 함수인 이유: eyebrow 에 날짜를 박는 규칙 때문에 카피가 낡는다.
 * 실제로 `2026년 하반기 / 올해 절반이 지났어요 / 남은 여섯 달의 목표` 가 박혀 있었는데,
 * 이건 7월에만 맞는 말이다. 몇 달만 지나도 "누군가 관리하고 있다"는 신호가
 * **정반대 신호**로 뒤집힌다 — 갱신을 잊은 사이트로 읽힌다.
 *
 * 그래서 시점에 묶이는 표현은 **연도 하나만** 남기고 전부 걷어냈다. 연도는 계산으로
 * 따라가므로 손대지 않아도 맞고, "올해 목표"라는 맥락은 그대로 산다.
 */
export const heroSlidesFor = (now: Date): HeroSlide[] => [
  // 2026-10-25 홈 재검토: 배너가 비로그인 랜딩으로 옮겨 왔다. 그래서 모든 슬라이드가 가입으로 이어지고,
  // 카피는 "혼자 쌓는 기록"이 아니라 "보여 주는 기록"(주소·스토리·케미)을 앞세운다.
  // "책장을 보면, 그 사람이 보인다"는 바로 위 맛보기의 h1 이라 여기서 되풀이하지 않는다.
  {
    id: 'link',
    eyebrow: '내 서재 주소',
    lines: ['책장은 주소가 됩니다', '링크 하나면 충분해요'],
    sub: 'page0127.com/아이디 하나로 읽은 책을 통째로 건네세요.',
    href: '/login',
    cta: '내 주소 만들기',
    bg: '#14294e',
    fg: '#f4f8fd',
  },
  {
    id: 'story',
    eyebrow: '인스타 스토리 공유',
    lines: ['읽은 책을', '한 장으로 자랑하세요'],
    sub: '서재도, 한 권의 한줄평도 스토리 이미지로 바로 만들어요.',
    href: '/login',
    cta: '스토리 만들기',
    bg: '#1e69cb',
    fg: '#f4f8fd',
  },
  {
    id: 'compatibility',
    eyebrow: '독서 케미',
    lines: ['두 사람의 책장을', '나란히 놓아볼까요'],
    sub: '겹치는 관심사와 서로 다른 결을 찾아, 건네줄 책까지 고릅니다.',
    href: '/login',
    cta: '케미 분석하기',
    // 코랄(포인트 컬러)의 딥 톤 — 블루 일색 배너 사이의 리듬
    bg: '#a63d10',
    fg: '#f4f8fd',
  },
  {
    id: 'taste',
    // 조건은 analysisGate 와 같은 말로 — "완독 5권"만 쓰면 평가 없는 완독도 세는 줄 안다
    eyebrow: `${TASTE_ANALYSIS_BOOK_LABEL} ${TASTE_ANALYSIS_MIN_BOOKS}권부터`,
    lines: ['다섯 권이면', '어떤 독자인지 보여요'],
    sub: '책장을 읽고 독서 성향에 이름을 붙여, 명함 맨 위에 올려 드려요.',
    href: '/login',
    cta: '취향 분석 보기',
    bg: '#5b3fb8',
    fg: '#f4f8fd',
  },
  {
    id: 'goal',
    eyebrow: `${now.getFullYear()}년 독서 목표`,
    lines: ['한 해의 목표를', '숫자로 세워 보세요'],
    sub: '목표를 채우면 달성 이미지로 한 해를 자랑할 수 있어요.',
    href: '/login',
    cta: '목표 세우기',
    bg: '#31405f',
    fg: '#f4f8fd',
  },
];
