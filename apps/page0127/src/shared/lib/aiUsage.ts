import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
export const MONTHLY_LIMIT = 3;

/** API 에러 응답용 — 두 라우트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_ERROR = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`;

/** UI 안내용 (토스트/캡션) — 여러 컴포넌트가 동일한 문구를 쓰도록 한 곳에서 관리한다 */
export const USAGE_LIMIT_EXCEEDED_MESSAGE = `이번 달 무료 분석 횟수(${MONTHLY_LIMIT}회)를 모두 사용했어요. 다음 달 1일에 초기화돼요.`;

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
export async function reserveUsage(
  supabase: SupabaseClient,
  feature: AiUsageFeature
): Promise<{ allowed: boolean; remaining: number; usageId: string | null }> {
  const { data, error } = await supabase.rpc('reserve_ai_usage', {
    p_feature: feature,
  });

  if (error) {
    console.error('AI 사용량 예약 실패:', error);
    // fail-closed: 예약 실패 시 OpenAI 호출 차단
    return { allowed: false, remaining: 0, usageId: null };
  }

  // TABLE 반환 함수라 data는 행 배열 — 첫 행을 읽는다
  const row = (Array.isArray(data) ? data[0] : data) as
    | { allowed: boolean; remaining: number; usage_id: string | null }
    | undefined;

  if (!row) {
    return { allowed: false, remaining: 0, usageId: null };
  }

  return {
    allowed: row.allowed,
    remaining: row.remaining,
    usageId: row.usage_id,
  };
}

/**
 * 예약했던 슬롯 1건을 되돌린다 (OpenAI 호출 시작 전에 실패했을 때만).
 *
 * ⚠️ 반드시 service-role(admin) 클라이언트로 호출해야 한다.
 *   일반 사용자에게 ai_usage_logs 삭제 권한을 열면, 자기 사용 기록을 지워
 *   월 한도를 무한히 리셋할 수 있기 때문이다. 그래서 삭제는 서버 전용
 *   service_role로만 수행하고, 예약한 행의 id로 "그 행만" 정확히 지운다.
 *
 * OpenAI 요청을 시작한 뒤에는 API 비용이 발생했을 수 있으므로 환불하지 않는다.
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
