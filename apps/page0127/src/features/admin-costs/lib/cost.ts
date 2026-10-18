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
