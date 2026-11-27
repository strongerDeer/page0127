import { isForViewer } from '@/entities/banner/lib/audience';

import type { HeroSlideRow } from '@/entities/banner/types';

/**
 * 어드민 목록에서 배너를 묶는 상태.
 * - live: 노출 켜짐 + 지금이 기간 안 → 홈에 나올 수 있다
 * - scheduled: 노출 켜짐 + 시작 전
 * - ended: 노출 켜짐 + 종료 지남 (= 지난 배너, 히스토리)
 * - off: 노출 꺼짐
 *
 * DB 의 RLS(`anyone can read published slides`)와 같은 규칙이다 — 홈이 읽는 배너와 어긋나면
 * 어드민이 "지금 홈"을 틀리게 보여 주게 된다.
 */
export type SlideStatus = 'live' | 'scheduled' | 'ended' | 'off';

type StatusFields = Pick<HeroSlideRow, 'is_active' | 'starts_at' | 'ends_at'>;

export const slideStatus = (slide: StatusFields, now: Date): SlideStatus => {
  if (!slide.is_active) return 'off';
  const t = now.getTime();
  if (slide.starts_at && new Date(slide.starts_at).getTime() > t)
    return 'scheduled';
  if (slide.ends_at && new Date(slide.ends_at).getTime() <= t) return 'ended';
  return 'live';
};

/**
 * 지금 홈 띠지에 실제로 나오는 배너 — 비회원·회원 각각.
 *
 * 홈은 보는 사람에게 맞는 게시 중 배너 중 **맨 앞 하나만** 띠지에 쓴다
 * (app/(public)/page.tsx 의 `banner?.slides[0]`). 그래서 순서가 곧 "무엇이 보이나"다.
 * 없으면 null — 홈은 기본 띠지 문구를 보여 준다.
 */
export const homeSlides = <
  T extends StatusFields & Pick<HeroSlideRow, 'id' | 'audience'>,
>(
  slides: T[],
  now: Date
): { guest: T | null; member: T | null } => {
  const live = slides.filter((s) => slideStatus(s, now) === 'live');
  return {
    guest: live.find((s) => isForViewer(s.audience, false)) ?? null,
    member: live.find((s) => isForViewer(s.audience, true)) ?? null,
  };
};

/** 목록·요약에서 배너를 부르는 이름 — 띠지 큰 문장, 없으면 통계 이름 */
export const slideTitle = (
  s: Pick<HeroSlideRow, 'line1' | 'line2' | 'cta'>
): string =>
  [s.line1, s.line2].filter(Boolean).join(' ') || s.cta || '(제목 없음)';
