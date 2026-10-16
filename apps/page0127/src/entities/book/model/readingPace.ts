/**
 * 올해 목표 대비 독서 속도.
 *
 * 학습 포인트:
 * - 날짜는 'YYYY-MM-DD' 문자열을 Date.UTC 로만 읽는다 → 실행 환경의 타임존과 무관하다.
 *   (new Date('2026-10-13') 를 로컬 시간으로 다루면 서버/브라우저에서 하루가 어긋날 수 있다)
 * - 문구는 여기서 만들지 않는다. 상태와 숫자만 내고, 말투는 UI(features/stats/model/paceMessage)가 정한다.
 */
export type ReadingPaceState =
  | 'met'
  | 'ahead'
  | 'on_track'
  | 'behind'
  | 'far_behind'
  | 'early'
  | 'no_goal'
  | 'past_met'
  | 'past_missed'
  /** 목표 없이 지난 해 — 문구가 과거형("읽었어요")이라 올해의 no_goal 과 나눈다 */
  | 'past_no_goal';

export type ReadingPace = {
  state: ReadingPaceState;
  /** 0~1, 올해 경과율 */
  elapsed: number;
  /** 소수 1자리, 오늘까지 와 있어야 할 권수 (목표 × 경과율) */
  expected: number;
  /** 정수, completed − expected 반올림 */
  gap: number;
  /** 정수, 지금 속도로 12/31 예상 — early·과거·목표 없음·달성은 null */
  projected: number | null;
  /** 소수 1자리, 연말까지 남은 주 */
  weeksLeft: number;
  /** 소수 1자리, 목표까지 주당 필요 권수 (달성 시 0) */
  perWeek: number;
  /** 소수 1자리, 월 평균 완독 */
  perMonth: number;
  /** 목표 초과 권수 (달성 시), 아니면 0 */
  surplus: number;
};

type ReadingPaceInput = {
  completed: number;
  target: number;
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
};

/**
 * 그 해의 목표 권수 — 사용자가 그 해에 정한 목표가 없으면 0.
 *
 * 예전에는 주인에게 통계의 기본값(50)을 목표로 넣어 줬다. 그러면 목표를 정한 적 없는
 * 새 사용자가 첫 화면에서 "목표 50권까지 50권 — 다시 정해 볼까요?"를 보게 된다.
 * 0 이면 getReadingPace 가 'no_goal' 이 되어 "목표 정하기"가 나온다.
 */
export const resolveGoalTarget = (
  goal: { year: number; target: number } | null | undefined,
  year: number
): number => (goal?.year === year ? goal.target : 0);

const DAY_MS = 24 * 60 * 60 * 1000;
/** 이보다 이른 시점(1월 첫 2주 남짓)의 예상 권수는 한두 권에 크게 흔들린다 */
const EARLY_ELAPSED = 0.04;
/** 주당 이만큼 넘게 필요하면 '많이 뒤처짐' */
const FAR_BEHIND_PER_WEEK = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;

const daysInYear = (year: number) =>
  (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY_MS;

const dayOfYear = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY_MS + 1;
};

export const getReadingPace = ({
  completed,
  target,
  year,
  today,
}: ReadingPaceInput): ReadingPace => {
  const todayYear = Number(today.slice(0, 4));
  const total = daysInYear(year);
  const isPast = year < todayYear;
  const passed = isPast ? total : year > todayYear ? 0 : dayOfYear(today);
  const elapsed = passed / total;

  // 남은 일수는 최소 1일 — 12/31 에도 "오늘 하루"는 남아 있다(0 으로 나누지 않기)
  const daysLeft = isPast ? 0 : Math.max(total - passed, 1);
  const weeksLeft = round1(daysLeft / 7);
  const remaining = Math.max(target - completed, 0);
  const perWeek = daysLeft > 0 ? round1(remaining / (daysLeft / 7)) : 0;
  const perMonth = elapsed > 0 ? round1(completed / (elapsed * 12)) : 0;
  const expected = round1(target * elapsed);
  const gap = Math.round(completed - target * elapsed);
  const surplus = target > 0 ? Math.max(completed - target, 0) : 0;

  const base = {
    elapsed,
    expected,
    gap,
    weeksLeft,
    perWeek,
    perMonth,
    surplus,
  };

  if (target <= 0) {
    return {
      ...base,
      state: isPast ? 'past_no_goal' : 'no_goal',
      projected: null,
    };
  }
  if (isPast) {
    return {
      ...base,
      state: completed >= target ? 'past_met' : 'past_missed',
      projected: null,
    };
  }
  if (completed >= target) return { ...base, state: 'met', projected: null };
  if (elapsed < EARLY_ELAPSED) {
    return { ...base, state: 'early', projected: null };
  }

  const projected = Math.round(completed / elapsed);
  const diff = completed - target * elapsed;

  if (diff >= 1) return { ...base, state: 'ahead', projected };
  if (Math.abs(diff) < 1) return { ...base, state: 'on_track', projected };
  if (perWeek > FAR_BEHIND_PER_WEEK) {
    return { ...base, state: 'far_behind', projected };
  }
  return { ...base, state: 'behind', projected };
};
