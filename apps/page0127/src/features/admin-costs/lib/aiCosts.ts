/**
 * Anthropic 비용 분석 API(조직 실제 청구액) — 조회 범위 만들기와 응답 해석. (네트워크 없음, 순수 함수)
 *
 * 왜 따로 읽나: 앱이 DB 에 남기는 cost_in_cents 는 그 DB 의 호출만 센다.
 * 로컬·개발 DB·테스트에서 같은 키로 부른 비용은 운영 DB 에 없어서,
 * 어드민만 보고는 실제로 얼마가 빠졌는지(예산이 모자라는지) 알 수 없었다(2026-10-18).
 * 비용 분석 API 는 조직의 모든 키·환경을 합친 실제 금액을 시간 단위로 준다.
 *
 * 왜 1시간 버킷인가: API 의 버킷 경계는 UTC 다. 하루(1d) 버킷으로 읽으면 KST 달력과
 * 9시간 어긋나 "이번 달"에 지난달 마지막 날 오후가 섞인다. 1시간 버킷으로 받아
 * 여기서 KST 날짜로 다시 묶으면 어드민의 다른 칸(앱 기록)과 같은 달·같은 날이 된다.
 * 한 달 744칸이라 한 번에 최대 1,000줄인 한도 안에 들어온다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** `date` 가 속한 달 1일 00:00(KST) — 어드민 비용 화면과 같은 달 경계. offset 1 이면 다음 달 1일 */
const monthStartKst = (date: Date, offset = 0): Date => {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const startKstAsUtc = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth() + offset,
    1
  );
  return new Date(startKstAsUtc - KST_OFFSET_MS);
};

export type CostsRange = { starting_at: string; ending_at: string };

/**
 * `month` 가 속한 달(KST) 1일부터, 그 달 끝과 `now` 직전 정시 중 이른 쪽까지.
 *
 * - 끝을 정시로 내리는 건 API 가 버킷 경계로 내림하기 때문 — 같은 값을 미리 맞춰 둔다.
 * - 크론은 매달 1일에 "어제 = 지난달"을 읽으므로 month 와 now 가 다른 달일 수 있다.
 * - 달이 막 바뀐 첫 1시간처럼 범위가 비면 null(부를 필요 없음).
 */
export const costsRange = (
  month: Date,
  now: Date = month
): CostsRange | null => {
  const start = monthStartKst(month);
  const nowHour = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const end = new Date(Math.min(nowHour, monthStartKst(month, 1).getTime()));
  if (end <= start) return null;
  return { starting_at: start.toISOString(), ending_at: end.toISOString() };
};

/** SDK 의 BetaAnalyticsCostItem 중 여기서 쓰는 칸만 */
export type CostItem = {
  starting_at: string;
  cost: { amount: string; currency: string };
};

export type AiCosts = {
  /** 이번 달 실제 청구액(USD 센트, 소수 포함 — 한 번 호출이 1센트도 안 될 때가 많다) */
  totalCents: number;
  /** 쓴 날만, 날짜순(KST 달력) */
  daily: { date: string; cents: number }[];
};

const kstDate = (iso: string) =>
  new Date(Date.parse(iso) + KST_OFFSET_MS).toISOString().slice(0, 10);

/** 센트를 소수 둘째 자리까지 — 부동소수 오차(0.30000000000000004) 정리 */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 시간 버킷들을 KST 날짜로 묶는다. amount 는 **센트 단위 소수 문자열**("12.5" = 12.5센트)이다.
 * 달러가 아닌 통화·숫자가 아닌 값은 세지 않는다 — 예산은 달러를 원화로 바꿔 비교하므로
 * 다른 통화가 섞이면 금액이 틀어진다.
 */
export const parseCostItems = (items: CostItem[]): AiCosts => {
  const byDate = new Map<string, number>();
  for (const item of items) {
    const { amount, currency } = item.cost;
    if (currency && currency.toUpperCase() !== 'USD') continue;
    const cents = Number(amount);
    if (!Number.isFinite(cents)) continue;
    const date = kstDate(item.starting_at);
    byDate.set(date, (byDate.get(date) ?? 0) + cents);
  }

  const daily = [...byDate.entries()]
    .map(([date, cents]) => ({ date, cents: round2(cents) }))
    .filter((day) => day.cents > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCents: round2(daily.reduce((sum, day) => sum + day.cents, 0)),
    daily,
  };
};

/** `now` 기준 어제(KST)의 날짜와 24시간 전 시각 — 어제가 속한 달을 읽는 기준(1일엔 지난달) */
export const kstYesterday = (now: Date): { date: string; at: Date } => {
  const at = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return { date: kstDate(at.toISOString()), at };
};

/**
 * 하루치 청구가 더해지기 직전·직후의 이달 누적액.
 *
 * 예산 알림의 "넘는 순간만 알리기"(crossedBudgetThreshold)를 청구액에도 쓰려고 만든다.
 * 크론이 하루 한 번 **어제(끝난 날)** 만 보므로 같은 날을 두 번 세지 않고,
 * 이미 보냈다는 기록을 따로 저장하지 않아도 된다.
 */
export const dayCrossingInput = (
  costs: AiCosts,
  date: string
): { beforeCents: number; afterCents: number } => {
  const upTo = costs.daily.filter((day) => day.date <= date);
  const afterCents = round2(upTo.reduce((sum, day) => sum + day.cents, 0));
  const dayCents = upTo.find((day) => day.date === date)?.cents ?? 0;
  return { beforeCents: round2(afterCents - dayCents), afterCents };
};
