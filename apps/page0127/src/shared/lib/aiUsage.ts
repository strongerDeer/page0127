import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
const MONTHLY_LIMIT = 3;

export type AiUsageFeature = 'taste_analysis' | 'compatibility';

/**
 * 이번 달(달력 기준 1일 00:00~) 사용 횟수를 세어 한도 초과 여부를 반환한다.
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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

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
 * 사용 기록 1건을 남긴다. OpenAI 호출과 결과 저장이 모두 성공한 뒤에만 호출해야
 * 한다 — 실패한 시도로 사용자의 quota가 낭비되는 것을 막기 위함이다.
 *
 * INSERT 오류 시 로그만 남기고 throws하지 않는다. 호출자(분석 완료)의 성공을
 * 사용량 기록 장애로 인해 실패 처리하지 않기 위함이다.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<void> {
  const { error } = await supabase
    .from('ai_usage_logs')
    .insert({ user_id: userId, feature });

  if (error) {
    console.error('AI 사용량 기록 저장 실패:', error);
  }
}
