/** 'YYYY-MM' → 그 달에 모은 문장 수 */
export type SentenceMonthCounts = Record<string, number>;

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

/** timestamptz → 한국 시간 기준 'YYYY-MM' (자정 무렵 적은 문장이 전날 달로 밀리지 않게) */
const toSeoulMonth = (timestamp: string) =>
  new Date(new Date(timestamp).getTime() + SEOUL_OFFSET_MS)
    .toISOString()
    .slice(0, 7);

/**
 * 방문자 캘린더의 "이 달 모은 문장 N개" — 문장 서랍의 두 탭(내가 적은 문장 + 펼친 오늘의 문장)을
 * 달별 개수로만 접는다. 글·책·날짜는 여기서 버려져 화면으로 나가지 않는다.
 */
export const countSentencesByMonth = ({
  quoteCreatedAts,
  drawDates,
}: {
  /** book_quotes.created_at (timestamptz) */
  quoteCreatedAts: string[];
  /** sentence_draws.draw_date ('YYYY-MM-DD', 이미 한국 날짜) */
  drawDates: string[];
}): SentenceMonthCounts => {
  const counts: SentenceMonthCounts = {};
  const add = (month: string) => {
    counts[month] = (counts[month] ?? 0) + 1;
  };
  quoteCreatedAts.forEach((ts) => add(toSeoulMonth(ts)));
  drawDates.forEach((date) => add(date.slice(0, 7)));
  return counts;
};
