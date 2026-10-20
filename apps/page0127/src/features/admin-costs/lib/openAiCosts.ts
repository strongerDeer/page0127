/**
 * OpenAI Costs API(조직 실제 청구액) — 주소 만들기와 응답 해석. (네트워크 없음, 순수 함수)
 *
 * 왜 따로 읽나: 앱이 DB 에 남기는 cost_in_cents 는 그 DB 의 호출만 센다.
 * 로컬·개발 DB·테스트에서 같은 OpenAI 키로 부른 비용은 운영 DB 에 없어서,
 * 어드민만 보고는 실제로 얼마가 빠졌는지(예산이 모자라는지) 알 수 없었다(2026-10-18).
 * Costs API 는 조직의 모든 키·환경을 합친 실제 청구액을 하루 단위로 준다.
 *
 * 요청·응답 모양은 openai SDK 의 `admin.organization.usage.costs` 타입을 따랐다.
 */

const COSTS_ENDPOINT = 'https://api.openai.com/v1/organization/costs';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** 한 달은 최대 31일 — 버킷 하나가 하루 */
const BUCKETS_PER_MONTH = 31;

/** 이번 달 1일 00:00(KST)의 Unix 초 — 어드민 비용 화면과 같은 달 경계 */
const monthStartUnix = (now: Date): number => {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const startKstAsUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1);
  return (startKstAsUtc - KST_OFFSET_MS) / 1000;
};

export const buildCostsUrl = (now: Date, page?: string): URL => {
  const url = new URL(COSTS_ENDPOINT);
  url.searchParams.set('start_time', String(monthStartUnix(now)));
  url.searchParams.set('bucket_width', '1d');
  url.searchParams.set('limit', String(BUCKETS_PER_MONTH));
  if (page) url.searchParams.set('page', page);
  return url;
};

type CostResult = { amount?: { value?: number; currency?: string } };
export type CostBucket = { start_time: number; results?: CostResult[] };

export type OpenAiCosts = {
  /** 이번 달 실제 청구액(USD 센트, 소수 포함 — 한 번 호출이 1센트도 안 될 때가 많다) */
  totalCents: number;
  /** 쓴 날만, 날짜순(KST 달력) */
  daily: { date: string; cents: number }[];
};

const kstDate = (unixSeconds: number) =>
  new Date(unixSeconds * 1000 + KST_OFFSET_MS).toISOString().slice(0, 10);

/** 센트를 소수 둘째 자리까지 — 부동소수 오차(0.30000000000000004) 정리 */
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 버킷들을 합친다. 달러가 아닌 통화·값 없는 결과는 세지 않는다 —
 * 예산은 달러를 원화로 바꿔 비교하므로 다른 통화가 섞이면 금액이 틀어진다.
 */
export const parseCostBuckets = (buckets: CostBucket[]): OpenAiCosts => {
  const daily = buckets
    .map((bucket) => ({
      date: kstDate(bucket.start_time),
      cents: round2(
        (bucket.results ?? []).reduce((sum, result) => {
          const { value, currency } = result.amount ?? {};
          if (typeof value !== 'number') return sum;
          if (currency && currency.toLowerCase() !== 'usd') return sum;
          return sum + value * 100;
        }, 0)
      ),
    }))
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
  return { date: kstDate(at.getTime() / 1000), at };
};

/**
 * 하루치 청구가 더해지기 직전·직후의 이달 누적액.
 *
 * 예산 알림의 "넘는 순간만 알리기"(crossedBudgetThreshold)를 청구액에도 쓰려고 만든다.
 * 크론이 하루 한 번 **어제(끝난 날)** 만 보므로 같은 날을 두 번 세지 않고,
 * 이미 보냈다는 기록을 따로 저장하지 않아도 된다.
 */
export const dayCrossingInput = (
  costs: OpenAiCosts,
  date: string
): { beforeCents: number; afterCents: number } => {
  const upTo = costs.daily.filter((day) => day.date <= date);
  const afterCents = round2(upTo.reduce((sum, day) => sum + day.cents, 0));
  const dayCents = upTo.find((day) => day.date === date)?.cents ?? 0;
  return { beforeCents: round2(afterCents - dayCents), afterCents };
};
