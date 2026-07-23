export type CostRow = { cost_in_cents: number | null };

/** cost_in_cents 합계 (null 무시). 단위: USD 센트 */
export function sumCents(rows: CostRow[]): number {
  return rows.reduce((acc, r) => acc + (r.cost_in_cents ?? 0), 0);
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
