/**
 * AI 월 예산 도달 → 카톡 문구. (네트워크 없음, 순수 함수)
 *
 * 학습 포인트 — "넘는 순간"만 알리기:
 * "지금 80% 이상인가"로 판정하면 80% 를 넘긴 뒤의 호출마다 알림이 또 간다.
 * 그걸 막으려면 "이미 보냈다"를 어딘가 저장해야 한다. 대신 **이번 호출 직전과 직후를
 * 비교**하면(직전 < 기준 ≤ 직후) 기준선을 건너는 호출은 한 달에 한 번뿐이라 저장소가 필요 없다.
 * 두 요청이 동시에 기준선을 건너면 두 번 갈 수 있지만, 알림 한 통이 더 오는 정도라 감수한다.
 *
 * OpenAI 는 선불 잔액을 API 로 주지 않는다. 그래서 잔액이 아니라 앱이 기록하는
 * 이번 달 사용액(cost_in_cents)을 월 예산과 비교한다.
 * 로컬·테스트까지 합친 실제 청구액은 하루 한 번 크론(check-ai-billing)이 따로 본다 — toBillingAlertText.
 */

/** 알림을 보내는 기준선(%) — 높은 쪽이 먼저 오게 둔다 */
export const BUDGET_ALERT_THRESHOLDS = [100, 80] as const;

export type BudgetThreshold = (typeof BUDGET_ALERT_THRESHOLDS)[number];

type CrossingInput = {
  /** 이번 호출 전까지의 이번 달 사용액 */
  beforeCents: number;
  /** 이번 호출까지 더한 사용액 */
  afterCents: number;
  budgetCents: number;
};

/** 이번 호출이 건넌 기준선 중 가장 높은 것. 건넌 게 없으면 null */
export const crossedBudgetThreshold = ({
  beforeCents,
  afterCents,
  budgetCents,
}: CrossingInput): BudgetThreshold | null => {
  if (budgetCents <= 0) return null;

  for (const threshold of BUDGET_ALERT_THRESHOLDS) {
    const line = (budgetCents * threshold) / 100;
    if (beforeCents < line && afterCents >= line) return threshold;
  }
  return null;
};

type AlertTextInput = {
  threshold: BudgetThreshold;
  spentCents: number;
  budgetCents: number;
  usdToKrw: number;
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const toBudgetAlertText = ({
  threshold,
  spentCents,
  budgetCents,
  usdToKrw,
}: AlertTextInput): string => {
  const krw = Math.round((spentCents / 100) * usdToKrw).toLocaleString('ko-KR');
  const headline =
    threshold >= 100
      ? '🛑 [page0127.] AI 월 예산 100% — 이번 달 AI 분석이 닫혔습니다'
      : `⚠️ [page0127.] AI 월 예산 ${threshold}% 도달`;

  return [
    headline,
    `이번 달 사용 ${usd(spentCents)} / ${usd(budgetCents)} (약 ${krw}원)`,
    'OpenAI 선불 잔액도 Billing 에서 확인하세요.',
  ].join('\n');
};

/**
 * OpenAI **실제 청구액** 기준 알림 문구 — 하루 한 번 크론이 어제까지의 청구를 보고 보낸다.
 *
 * 위 toBudgetAlertText 와 다른 점: 앱 기록(운영 DB)이 아니라 로컬·테스트까지 합친 조직 전체다.
 * 그래서 100% 여도 "AI 분석이 닫혔다"고 쓰지 않는다 — 분석을 닫는 가드(reserve_ai_usage)는
 * 운영 DB 기록을 보므로, 청구액이 먼저 넘어도 분석은 계속 열려 있을 수 있다.
 */
export const toBillingAlertText = ({
  threshold,
  spentCents,
  budgetCents,
  usdToKrw,
}: AlertTextInput): string => {
  const krw = Math.round((spentCents / 100) * usdToKrw).toLocaleString('ko-KR');

  return [
    `${threshold >= 100 ? '🛑' : '⚠️'} [page0127.] OpenAI 실제 청구액이 월 예산 ${threshold}% 를 넘었습니다`,
    `어제까지 청구 ${usd(spentCents)} / ${usd(budgetCents)} (약 ${krw}원, 로컬·테스트 포함)`,
    threshold >= 100
      ? '앱 기록 기준 가드는 아직 열려 있을 수 있어요 — 로컬 호출을 줄이거나 예산을 확인하세요.'
      : 'OpenAI 선불 잔액도 Billing 에서 확인하세요.',
  ].join('\n');
};
