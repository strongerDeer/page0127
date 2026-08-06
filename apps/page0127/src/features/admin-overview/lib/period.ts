import { toKstDateKey } from '@/shared/lib/date';

/**
 * 어드민 지표가 보는 기간 계산.
 *
 * 왜 "어제"가 기준인가:
 * 오늘은 아직 안 끝났다. 오전 9시에 "오늘 방문자 1명"을 보면 서비스가 죽은 줄
 * 안다 — 실제로는 하루가 시작됐을 뿐이다. **끝난 날끼리 비교해야** 늘었는지
 * 줄었는지 알 수 있다. 오늘 숫자도 함께 보여주되 "진행 중"임을 밝힌다.
 *
 * 날짜 경계는 전부 KST 다. user_daily_visits.visit_date 가 toKstDateKey 로
 * 쌓이므로(=/api/visit), 조회도 같은 기준을 써야 하루가 어긋나지 않는다.
 */

/** 하루 밀리초 */
const DAY_MS = 24 * 60 * 60 * 1000;

export type MetricPeriod = {
  /** KST 오늘 (YYYY-MM-DD) — 아직 진행 중인 날 */
  today: string;
  /** KST 어제 — 지표의 기준일 */
  yesterday: string;
  /** 최근 7일의 시작일(어제 포함 7일) */
  weekStart: string;
};

/**
 * @param now 기준 시각. 테스트가 고정 시각을 넣을 수 있게 인자로 받는다
 */
export const resolveMetricPeriod = (now: Date): MetricPeriod => ({
  today: toKstDateKey(now),
  yesterday: toKstDateKey(new Date(now.getTime() - DAY_MS)),
  // 어제를 마지막 날로 하는 7일 구간 → 어제로부터 6일 전이 시작
  weekStart: toKstDateKey(new Date(now.getTime() - 7 * DAY_MS)),
});

/**
 * KST 날짜 문자열을 그 날 00:00(KST)의 UTC 시각으로 바꾼다.
 *
 * created_at 같은 timestamptz 컬럼을 날짜로 거를 때 쓴다. 문자열 비교로 하면
 * UTC 기준이 되어 **KST 오전 9시 이전에 만들어진 것이 전날로 새어 나간다.**
 */
export const kstDateToUtcStart = (dateKey: string): string =>
  new Date(`${dateKey}T00:00:00+09:00`).toISOString();

/** 그 날의 끝(다음 날 00:00 KST) — 범위 조회의 상한으로 쓴다 */
export const kstDateToUtcEnd = (dateKey: string): string =>
  new Date(new Date(`${dateKey}T00:00:00+09:00`).getTime() + DAY_MS).toISOString();
