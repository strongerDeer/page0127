import { APIError } from 'openai';

import { MONTHLY_BUDGET_CENTS } from '@/shared/lib/admin/config';

import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
export const MONTHLY_LIMIT = 3;

/** API 에러 응답용 — 두 라우트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_ERROR = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`;

/** UI 안내용 (토스트/캡션) — 여러 컴포넌트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_MESSAGE = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했어요. 다음 달 1일에 초기화돼요.`;

/**
 * 전역 예산이 바닥났을 때의 문구.
 *
 * 개인 한도 초과와 **다른 말을 해야 한다.** 횟수가 남아 있는데 "횟수를 다
 * 썼다"고 하면 사용자는 자기 화면(3/3 남음)과 어긋난 말을 듣고 고장으로 읽는다.
 * 서비스 사정이라는 것을 밝히되, 운영자의 지갑 사정까지 설명할 필요는 없다.
 */
export const BUDGET_EXCEEDED_ERROR =
  '이번 달 AI 분석이 모두 소진됐습니다. 다음 달 1일에 다시 열립니다.';

export const BUDGET_EXCEEDED_MESSAGE =
  '이번 달 AI 분석이 모두 소진됐어요. 다음 달 1일에 다시 열려요.';

export type AiUsageFeature = 'taste_analysis' | 'compatibility';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * KST(UTC+9) 기준 "이번 달 1일 00:00"에 해당하는 실제 UTC 시각을 반환한다.
 *
 * 서버가 어떤 타임존에서 돌든(배포 환경은 보통 UTC) 결과가 항상 KST 달력
 * 기준이 되도록, 현재 시각에 9시간을 더한 뒤 UTC getter로 "KST 벽시계
 * 값"을 읽어 연/월을 구하고, 그 값으로 만든 UTC 자정에서 다시 9시간을
 * 빼서 실제 UTC 시각으로 되돌린다.
 */
function getStartOfMonthKst(): Date {
  const nowAsIfKst = new Date(Date.now() + KST_OFFSET_MS);
  const startOfMonthKstLabeledAsUtc = Date.UTC(
    nowAsIfKst.getUTCFullYear(),
    nowAsIfKst.getUTCMonth(),
    1
  );
  return new Date(startOfMonthKstLabeledAsUtc - KST_OFFSET_MS);
}

/**
 * 이번 달(KST 달력 기준 1일 00:00~) 사용 횟수를 세어 한도 초과 여부를 반환한다.
 * 실제 OpenAI 호출 직전에만 호출해야 한다 (캐시 히트·입력값 검증 통과 이후).
 *
 * DB 조회 오류 시 fail-closed: { allowed: false, remaining: 0 }을 반환해
 * OpenAI 호출을 차단한다 (사용량 제한 기능이 DB 장애로 무력화되는 것을 방지).
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<{ allowed: boolean; remaining: number }> {
  const startOfMonth = getStartOfMonthKst();

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('AI 사용량 조회 실패:', error);
    // fail-closed: 쿼리 오류 시 API 호출 차단
    return { allowed: false, remaining: 0 };
  }

  const used = count ?? 0;
  return {
    allowed: used < MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
  };
}

/**
 * OpenAI 호출 "전에" 이번 달 슬롯 1건을 원자적으로 예약한다.
 *
 * reserve_ai_usage RPC가 카운트 확인 + 로그 insert를 한 트랜잭션에서 수행하고,
 * 같은 사용자+기능 동시 요청은 advisory lock으로 직렬화하므로 한도 초과 호출이
 * 원천 차단된다. (기존 checkUsageLimit → OpenAI → recordUsage 구조는 조회와
 * 기록 사이에 OpenAI가 끼어 동시 요청이 중복 호출될 수 있었다.)
 *
 * 반환:
 * - allowed: 예약 성공 여부 (false면 이번 달 한도 소진)
 * - remaining: 예약 반영 후 남은 횟수
 * - usageId: 예약된 로그 행 id (분석 실패 시 refund 대상). allowed=false면 null.
 *
 * RPC/조회 오류 시 fail-closed: { allowed: false } 로 OpenAI 호출을 차단한다.
 */
/**
 * 이번 달(KST) 지금까지 쓴 금액을 USD 센트로 돌려준다.
 *
 * 비용은 ai_usage_logs 가 아니라 **분석 결과 테이블**에 있다(cost_in_cents).
 * 호출 횟수가 아니라 실제 토큰 비용이라 이쪽이 청구서에 가깝다.
 *
 * 어드민 대시보드(getCostSummary)와 같은 두 테이블을 같은 월 경계로 본다.
 * 기준이 갈리면 "게이지는 80%인데 차단은 안 되는" 상태가 생긴다.
 *
 * 조회 실패는 0 으로 떨어뜨린다 — 여기서 막아 버리면 DB 일시 오류에
 * 기능 전체가 멈춘다. 진짜 관문은 DB 안의 reserve_ai_usage 이고,
 * 이 함수는 **거절 사유를 가르는 용도**다.
 */
export async function getMonthlySpentCents(
  supabase: SupabaseClient
): Promise<number> {
  const since = getStartOfMonthKst().toISOString();

  const [taste, compat] = await Promise.all([
    supabase
      .from('taste_analyses')
      .select('cost_in_cents')
      .gte('created_at', since),
    supabase
      .from('compatibility_analyses')
      .select('cost_in_cents')
      .gte('created_at', since),
  ]);

  if (taste.error || compat.error) {
    console.error(
      'AI 사용액 조회 실패:',
      taste.error?.message ?? compat.error?.message
    );
    return 0;
  }

  const sum = (rows: { cost_in_cents: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.cost_in_cents ?? 0), 0);

  return sum(taste.data) + sum(compat.data);
}

export async function reserveUsage(
  supabase: SupabaseClient,
  feature: AiUsageFeature
): Promise<{
  allowed: boolean;
  remaining: number;
  usageId: string | null;
  /** 거절 사유 — 개인 한도와 전역 예산은 사용자에게 다른 말을 해야 한다 */
  reason: 'ok' | 'user_limit' | 'budget' | 'error';
}> {
  // 전역 상한을 앱이 넘긴다. DB 에 값을 박아 두면 환율·예산을 고칠 때
  // 어드민 게이지와 실제 차단 기준이 어긋난다.
  const { data, error } = await supabase.rpc('reserve_ai_usage', {
    p_feature: feature,
    p_budget_cents: MONTHLY_BUDGET_CENTS,
  });

  if (error) {
    console.error('AI 사용량 예약 실패:', error);
    // fail-closed: 예약 실패 시 OpenAI 호출 차단
    return { allowed: false, remaining: 0, usageId: null, reason: 'error' };
  }

  // TABLE 반환 함수라 data는 행 배열 — 첫 행을 읽는다
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; remaining: number; usage_id: string | null }
    | undefined;

  if (!row) {
    return { allowed: false, remaining: 0, usageId: null, reason: 'error' };
  }

  // 거절 사유는 DB 가 돌려주지 않는다(반환 형태를 바꾸면 호출부가 전부 흔들린다).
  // 대신 여기서 한 번 더 확인해 가른다 — 전역 예산은 사용자와 무관하게 결정되므로
  // 같은 기준으로 다시 재도 결과가 같다.
  let reason: 'ok' | 'user_limit' | 'budget' | 'error' = 'ok';
  if (!row.allowed) {
    const spent = await getMonthlySpentCents(supabase);
    reason = spent >= MONTHLY_BUDGET_CENTS ? 'budget' : 'user_limit';
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    usageId: row.usage_id,
    reason,
  };
}

/**
 * OpenAI가 "과금 없이" 요청을 반려했는지 판정한다.
 *
 * 4xx는 요청이 모델에 닿기 전에 반려된 것이라 토큰 비용이 발생하지 않는다.
 * (잘못된 API 키 401, 잔액 부족·요청 한도 429, 잘못된 파라미터 400 등)
 * 이런 실패까지 사용 횟수를 차감하면, 서비스 쪽 설정 실수의 대가를 사용자가
 * 월 한도로 치르게 된다.
 *
 * 반대로 5xx·연결 오류·408은 생성이 시작된 뒤 끊겼을 수 있어 환불하지 않는다.
 * 판정이 애매할 때는 "차감 유지" 쪽이 안전하다 — 잘못 환불하면 유료 호출을
 * 한도 없이 반복할 수 있기 때문이다.
 */
export function isUnbilledOpenAiFailure(error: unknown): boolean {
  if (!(error instanceof APIError)) return false;

  const { status } = error;
  if (typeof status !== 'number') return false;

  return status >= 400 && status < 500 && status !== 408;
}

/**
 * 예약했던 슬롯 1건을 되돌린다.
 * (OpenAI 호출 시작 전 실패 또는 위 isUnbilledOpenAiFailure에 해당하는 실패)
 *
 * ⚠️ 반드시 service-role(admin) 클라이언트로 호출해야 한다.
 *   일반 사용자에게 ai_usage_logs 삭제 권한을 열면, 자기 사용 기록을 지워
 *   월 한도를 무한히 리셋할 수 있기 때문이다. 그래서 삭제는 서버 전용
 *   service_role로만 수행하고, 예약한 행의 id로 "그 행만" 정확히 지운다.
 *
 * 토큰 비용이 발생했을 수 있는 실패(5xx·연결 끊김 등)는 호출부에서 걸러내고
 * 이 함수까지 오지 않게 한다.
 * best-effort: 삭제가 실패해도 throw하지 않는다.
 */
export async function refundUsage(
  adminSupabase: SupabaseClient,
  usageId: string
): Promise<void> {
  const { error } = await adminSupabase
    .from('ai_usage_logs')
    .delete()
    .eq('id', usageId);

  if (error) {
    console.error('AI 사용량 환불(삭제) 실패:', error);
  }
}
