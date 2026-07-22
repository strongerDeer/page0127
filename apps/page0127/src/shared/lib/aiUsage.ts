import type { SupabaseClient } from '@supabase/supabase-js';

/** 무료 사용자 월별 허용 횟수 (기능별 독립 카운트) */
const MONTHLY_LIMIT = 3;

export type AiUsageFeature = 'taste_analysis' | 'compatibility';

/**
 * 이번 달(달력 기준 1일 00:00~) 사용 횟수를 세어 한도 초과 여부를 반환한다.
 * 실제 OpenAI 호출 직전에만 호출해야 한다 (캐시 히트·입력값 검증 통과 이후).
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<{ allowed: boolean; remaining: number }> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', startOfMonth.toISOString());

  const used = count ?? 0;
  return {
    allowed: used < MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
  };
}

/**
 * 사용 기록 1건을 남긴다. OpenAI 호출과 결과 저장이 모두 성공한 뒤에만 호출해야
 * 한다 — 실패한 시도로 사용자의 quota가 낭비되는 것을 막기 위함이다.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: AiUsageFeature
): Promise<void> {
  await supabase.from('ai_usage_logs').insert({ user_id: userId, feature });
}
