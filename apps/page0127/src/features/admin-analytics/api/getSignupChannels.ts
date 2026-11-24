import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
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
  // 레이아웃의 확인만으로는 부족하다 — 레이아웃과 페이지는 병렬로 렌더링돼서, 레이아웃이 404 를
  // 던져도 이 함수의 결과가 응답(RSC 데이터)에 실릴 수 있다. 데이터를 꺼내는 곳에서 다시 확인한다.
  await assertAdmin();
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
