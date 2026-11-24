import { createAdminClient } from '@/shared/config/supabase/admin';
import { type DateRange, toUtcBounds } from '@/shared/lib/admin/dateRange';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';

import {
  countSignupChannels,
  type SignupChannelCount,
} from '../lib/signupChannels';

import type { AttributionLike } from '@/shared/lib/attribution/signupChannel';

export type SignupChannelsResult =
  | { status: 'ok'; total: number; rows: SignupChannelCount[] }
  | { status: 'error'; message: string };

/**
 * 기간 안 가입자가 처음 어디서 왔나 — 우리 DB 기준(GA 와 달리 실제 가입한 사람만).
 * 운영자·체험·테스트 계정은 대시보드 지표와 같은 기준(getAdminUserIds)으로 뺀다.
 * 가입자가 수십~수백 명 규모라 id 를 다 읽어 앱에서 센다.
 */
export const getSignupChannels = async (
  range: DateRange
): Promise<SignupChannelsResult> => {
  const supabase = createAdminClient();
  const { gte, lt } = toUtcBounds(range);
  const excluded = await getAdminUserIds();

  let query = supabase
    .from('profiles')
    .select('id')
    .gte('created_at', gte)
    .lt('created_at', lt)
    .limit(1000);
  if (excluded.length > 0) query = query.not('id', 'in', toInFilter(excluded));
  const { data: members, error } = await query;
  if (error) return { status: 'error', message: error.message };

  const ids = members.map((m) => m.id as string);
  const attributions = new Map<string, NonNullable<AttributionLike>>();
  if (ids.length > 0) {
    const { data, error: attrError } = await supabase
      .from('signup_attributions')
      .select('user_id, source, medium, referrer_host')
      .in('user_id', ids);
    if (attrError) return { status: 'error', message: attrError.message };
    for (const r of data)
      attributions.set(r.user_id as string, r as NonNullable<AttributionLike>);
  }

  return {
    status: 'ok',
    total: ids.length,
    rows: countSignupChannels(ids, attributions),
  };
};
