/** 정지 기간 입력 */
export type SuspendInput =
  { kind: 'permanent' } | { kind: 'days'; days: number };

/** Supabase ban_duration + profiles.suspended_until 미러 값 */
export type BanParams = {
  banDuration: string;
  suspendedUntil: string | null; // null = 영구
};

const PERMANENT_BAN = '876000h'; // ≈ 100년

export function computeBan(input: SuspendInput, now: Date): BanParams {
  if (input.kind === 'permanent') {
    return { banDuration: PERMANENT_BAN, suspendedUntil: null };
  }
  const hours = input.days * 24;
  const until = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
  return { banDuration: `${hours}h`, suspendedUntil: until.toISOString() };
}

/**
 * 목록/상세 표시용: 지금 정지 중인가.
 * 임시 정지는 Supabase 쪽에서 만료돼도 미러가 남으므로,
 * 읽는 시점에 계산해 자가 치유한다.
 */
export function isCurrentlySuspended(
  status: string,
  suspendedUntil: string | null,
  now: Date
): boolean {
  if (status !== 'suspended') return false;
  if (suspendedUntil === null) return true; // 영구
  return new Date(suspendedUntil).getTime() > now.getTime();
}
