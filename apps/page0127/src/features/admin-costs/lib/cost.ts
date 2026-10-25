export type CostRow = { cost_in_cents: number | null };

/** cost_in_cents 합계 (null 무시). 단위: USD 센트 */
export function sumCents(rows: CostRow[]): number {
  return rows.reduce((acc, r) => acc + (r.cost_in_cents ?? 0), 0);
}

/**
 * 예산 게이지가 기준으로 삼을 금액(USD 센트).
 * - OpenAI 실제 청구액(조직 전체 — 로컬·테스트 포함)을 읽었으면 앱 기록과 비교해 큰 쪽.
 *   실제 청구는 반영이 몇 시간~하루 늦어 방금 쓴 운영 비용이 아직 없을 수 있다.
 * - 못 읽었으면(null) 운영 앱 기록만.
 */
export function budgetBasisCents(
  appCents: number,
  actualCents: number | null
): number {
  return actualCents === null ? appCents : Math.max(appCents, actualCents);
}

export type BudgetUsage = {
  usd: number; // 달러
  krw: number; // 원(반올림 정수)
  budgetKrw: number;
  percent: number; // 0~100+ (반올림 정수)
};

export function computeBudgetUsage(
  totalCents: number,
  opts: { usdToKrw: number; budgetKrw: number }
): BudgetUsage {
  const usd = totalCents / 100;
  const krw = Math.round(usd * opts.usdToKrw);
  const percent =
    opts.budgetKrw > 0 ? Math.round((krw / opts.budgetKrw) * 100) : 0;
  return { usd, krw, budgetKrw: opts.budgetKrw, percent };
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatKrw(krw: number): string {
  return `₩${krw.toLocaleString('ko-KR')}`;
}

export type DailyCostRow = {
  date: string;
  /** 운영 앱 기록(USD 센트) — 그날 운영 DB 에 남은 분석 비용 */
  appCents: number;
  /** OpenAI 실제 청구(USD 센트). null = 청구액을 못 읽음 */
  actualCents: number | null;
};

/**
 * 일별 추이 — 앱 기록과 실제 청구를 날짜별로 나란히 합친다.
 *
 * 실제 청구만 보여 주면 오늘처럼 청구 반영이 늦은 날은 운영에서 돌린 분석이 통째로 안 보인다
 * (2026-10-25: 오늘 돌린 취향 분석이 일별 목록에 없었다). 둘 중 한쪽에만 있는 날도 남긴다.
 * 실제 청구 버킷은 UTC 하루 단위라 날짜 경계가 KST 와 9시간 어긋날 수 있다 — 하루 단위 추이로만 본다.
 */
export function mergeDailyCosts(
  app: { date: string; cents: number }[],
  actual: { date: string; cents: number }[] | null
): DailyCostRow[] {
  const rows = new Map<string, DailyCostRow>();
  const row = (date: string) => {
    const existing = rows.get(date);
    if (existing) return existing;
    const created: DailyCostRow = {
      date,
      appCents: 0,
      actualCents: actual === null ? null : 0,
    };
    rows.set(date, created);
    return created;
  };
  for (const d of app) row(d.date).appCents += d.cents;
  for (const d of actual ?? []) {
    const r = row(d.date);
    r.actualCents = (r.actualCents ?? 0) + d.cents;
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}
