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
