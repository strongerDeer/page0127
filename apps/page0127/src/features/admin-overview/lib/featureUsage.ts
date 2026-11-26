import { bucketByDay, type TrendPoint } from './trend';

import type { DateRange } from '@/shared/lib/admin/dateRange';
import type { AnalyticsEvent } from '@/shared/lib/analytics/trackEvent';

/**
 * 어드민 홈 '새 기능은 잘 쓰이나?' — 기능마다 GA 깔때기 단계(HJ 2026-11-26 B안).
 * GA 는 비회원까지 세지만 광고 차단은 빠지고, DB 는 정확하지만 회원(필사는 랭킹 이름)만 남는다.
 * 그래서 카드 하나에 둘을 나란히 둔다.
 */
export const SENTENCE_STEPS: { name: AnalyticsEvent; label: string }[] = [
  { name: 'daily_sentence_draw', label: '뽑기' },
  { name: 'daily_sentence_copy', label: '문장 복사' },
];

export const TYPING_STEPS: { name: AnalyticsEvent; label: string }[] = [
  { name: 'typing_start', label: '필사 시작' },
  { name: 'typing_page_complete', label: '쪽 완료' },
  { name: 'typing_chapter_complete', label: '장 완료' },
  { name: 'typing_rank_join', label: '랭킹 등록' },
];

export const FEATURE_EVENT_NAMES: AnalyticsEvent[] = [
  ...SENTENCE_STEPS,
  ...TYPING_STEPS,
].map((s) => s.name);

export type SentenceUsage = {
  /** 회원 뽑기 수(DB, 하루 한 사람 한 번) */
  draws: number;
  /** 뽑은 회원 수 */
  drawers: number;
  daily: TrendPoint[];
};

export type TypingUsage = {
  /** 회원이 새로 쓴 쪽 수(DB first_completed_at — 다시 쓴 쪽은 세지 않는다) */
  newPages: number;
  /** 쪽을 쓴 회원 수 */
  writers: number;
  daily: TrendPoint[];
  /** 비회원 랭킹에 새로 올라온 기록(쪽) 수와 사람(브라우저) 수 */
  guestScores: number;
  guestWriters: number;
  /** 지금 순위 참여를 켠 회원(기간과 무관한 누적) */
  rankOptIn: number;
};

const distinct = <T>(items: T[]) => new Set(items).size;

export const summarizeSentence = (
  rows: { user_id: string; draw_date: string }[],
  range: DateRange
): SentenceUsage => ({
  draws: rows.length,
  drawers: distinct(rows.map((r) => r.user_id)),
  daily: bucketByDay(
    rows.map((r) => r.draw_date),
    range
  ),
});

export const summarizeTyping = (
  pages: { user_id: string; dateKey: string }[],
  guests: { guest_id: string }[],
  rankOptIn: number,
  range: DateRange
): TypingUsage => ({
  newPages: pages.length,
  writers: distinct(pages.map((p) => p.user_id)),
  daily: bucketByDay(
    pages.map((p) => p.dateKey),
    range
  ),
  guestScores: guests.length,
  guestWriters: distinct(guests.map((g) => g.guest_id)),
  rankOptIn,
});
