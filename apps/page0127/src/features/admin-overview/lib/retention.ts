import {
  addDays,
  type DateRange,
  shortDate,
} from '@/shared/lib/admin/dateRange';

/**
 * D-2 재방문율 — user_daily_visits(하루 한 사람 한 줄)로 두 가지를 센다.
 *
 * 1) 기간 재방문: 기간 안에 들어온 사람 중 **서로 다른 2일 이상** 온 비율.
 *    "다시 오는 서비스인가"를 가장 짧게 답한다. 기간이 길수록 자연히 높아지므로
 *    같은 길이의 기간끼리만 비교한다(화면 문구로 밝힌다).
 *
 * 2) 가입 코호트: 기간 안에 가입한 사람이 가입 뒤 정해진 창 안에 다시 왔는가.
 *    D1 = 다음 날, W1 = 1~7일째, W4 = 22~28일째. 가입 당일 방문은 세지 않는다 —
 *    가입하려고 들어온 날이라 재방문이 아니다.
 *    창이 아직 안 끝난 사람(어제까지 28일이 안 지난 W4 등)은 **분모에서 뺀다.**
 *    넣으면 "아직 기회가 없었던 사람"이 이탈로 세어져 최근 코호트가 늘 나빠 보인다.
 */

/**
 * 방문 기록 적재 시작일(D-1 운영 적용, 2026-07-29). 이전 날짜는 기록이 없어
 * "안 왔다"와 "기록이 없다"를 구분할 수 없다 — 이보다 먼저 가입한 사람은 코호트에서 뺀다.
 */
export const VISIT_LOG_START = '2026-07-29';

/** 가입 후 창 [시작일째, 끝일째] — 가입일 = 0일째 */
export const RETENTION_WINDOWS = {
  d1: [1, 1],
  w1: [1, 7],
  w4: [22, 28],
} as const;

export type WindowKey = keyof typeof RETENTION_WINDOWS;

export type Ratio = {
  /** 창이 끝나 판정할 수 있는 사람 수 (분모) */
  eligible: number;
  /** 그중 창 안에 다시 온 사람 */
  retained: number;
  /** retained / eligible — 분모가 0 이면 null(0% 와 다르다) */
  rate: number | null;
};

export type CohortRow = {
  /** 가입 주의 월요일 */
  weekStart: string;
  /** 'MM/DD 주' */
  label: string;
  signups: number;
} & Record<WindowKey, Ratio>;

export type RetentionSummary = {
  /** 기간 안에 하루라도 온 사람 (순 방문자) */
  activeUsers: number;
  /** 그중 서로 다른 2일 이상 온 사람 */
  returningUsers: number;
  returningRate: number | null;
  /** 순 방문자 1명이 평균 며칠 왔나 */
  avgVisitDays: number | null;
  /** 가입 주별 코호트 — 오래된 주가 위 */
  cohorts: CohortRow[];
  /** 기간 전체 가입자 합산 */
  total: { signups: number } & Record<WindowKey, Ratio>;
  /** 기간 시작이 방문 기록 적재 전이라 앞부분이 비어 있다 */
  beforeLogStart: boolean;
};

export type VisitRow = { user_id: string; visit_date: string };
export type SignupRow = { id: string; signupDate: string };

const ratio = (retained: number, eligible: number): Ratio => ({
  eligible,
  retained,
  rate: eligible === 0 ? null : retained / eligible,
});

/** 그 날짜가 속한 주의 월요일 */
export const weekStartOf = (dateKey: string): string => {
  const dow = new Date(`${dateKey}T00:00:00Z`).getUTCDay(); // 0=일
  return addDays(dateKey, -((dow + 6) % 7));
};

/**
 * @param visits  기간 시작 ~ 어제까지의 방문(관리자 제외). 코호트 창이 기간 끝을 넘어가므로
 *                기간보다 넓게 받는다 — 기간 재방문 계산은 이 안에서 range 로 다시 자른다
 * @param signups 기간 안에 가입한 사람 (KST 가입일)
 * @param yesterday 판정 가능한 마지막 날 — 창 끝이 이보다 뒤면 아직 판정하지 않는다
 */
export const computeRetention = (
  visits: VisitRow[],
  signups: SignupRow[],
  range: DateRange,
  yesterday: string
): RetentionSummary => {
  // 사람별 방문 날짜 집합
  const byUser = new Map<string, Set<string>>();
  for (const v of visits) {
    let set = byUser.get(v.user_id);
    if (!set) byUser.set(v.user_id, (set = new Set()));
    set.add(v.visit_date);
  }

  // 1) 기간 재방문
  let activeUsers = 0;
  let returningUsers = 0;
  let visitDays = 0;
  for (const dates of byUser.values()) {
    let n = 0;
    for (const d of dates) if (d >= range.from && d <= range.to) n++;
    if (n === 0) continue;
    activeUsers++;
    visitDays += n;
    if (n >= 2) returningUsers++;
  }

  // 2) 가입 코호트
  const keys = Object.keys(RETENTION_WINDOWS) as WindowKey[];
  type Acc = { signups: number } & Record<
    WindowKey,
    { eligible: number; retained: number }
  >;
  const emptyAcc = (): Acc => ({
    signups: 0,
    d1: { eligible: 0, retained: 0 },
    w1: { eligible: 0, retained: 0 },
    w4: { eligible: 0, retained: 0 },
  });
  const weeks = new Map<string, Acc>();
  const total = emptyAcc();

  for (const s of signups) {
    if (s.signupDate < VISIT_LOG_START) continue;
    const week = weekStartOf(s.signupDate);
    let acc = weeks.get(week);
    if (!acc) weeks.set(week, (acc = emptyAcc()));
    acc.signups++;
    total.signups++;

    const dates = byUser.get(s.id);
    for (const k of keys) {
      const [startDay, endDay] = RETENTION_WINDOWS[k];
      const winEnd = addDays(s.signupDate, endDay);
      if (winEnd > yesterday) continue; // 아직 창이 안 끝났다 — 판정 보류
      const winStart = addDays(s.signupDate, startDay);
      let came = false;
      if (dates) {
        for (const d of dates) {
          if (d >= winStart && d <= winEnd) {
            came = true;
            break;
          }
        }
      }
      acc[k].eligible++;
      total[k].eligible++;
      if (came) {
        acc[k].retained++;
        total[k].retained++;
      }
    }
  }

  const toRatios = (a: Acc) =>
    Object.fromEntries(
      keys.map((k) => [k, ratio(a[k].retained, a[k].eligible)])
    ) as Record<WindowKey, Ratio>;

  return {
    activeUsers,
    returningUsers,
    returningRate: activeUsers === 0 ? null : returningUsers / activeUsers,
    avgVisitDays: activeUsers === 0 ? null : visitDays / activeUsers,
    cohorts: [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, acc]) => ({
        weekStart,
        label: `${shortDate(weekStart)} 주`,
        signups: acc.signups,
        ...toRatios(acc),
      })),
    total: { signups: total.signups, ...toRatios(total) },
    beforeLogStart: range.from < VISIT_LOG_START,
  };
};
