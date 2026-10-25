import { parseFollowingLeague } from '../model/readingLeague';

import type { FollowingLeague } from '../model/readingLeague';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 500;

/** 서버와 브라우저가 같은 RPC를 사용한다. 대상 ID는 RPC 인자가 아니라 세션에서 결정된다. */
export const getFollowingLeague = async (
  supabase: SupabaseClient,
  currentUserId: string
): Promise<FollowingLeague> => {
  const rows: unknown[] = [];
  let total: number | undefined;
  // PostgREST의 최대 반환 행 수 때문에 팔로잉 일부만으로 순위를 만들지 않도록 나눠 받는다.
  for (let offset = 0; ;) {
    const { data, error, count } = await supabase
      .rpc('get_following_reading_league', undefined, { count: 'exact' })
      .order('user_id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error)
      throw new Error('독서 리그를 불러오지 못했습니다.', { cause: error });
    if (!Array.isArray(data))
      throw new Error('독서 리그 응답을 확인할 수 없습니다.');
    if (
      count === null ||
      count < 0 ||
      (total !== undefined && total !== count)
    ) {
      throw new Error('독서 리그 집계 인원을 확인할 수 없습니다.');
    }
    total = count;
    rows.push(...data);
    if (rows.length === total) break;
    if (data.length === 0 || rows.length > total)
      throw new Error('독서 리그 일부 기록이 누락되었습니다.');
    offset += data.length;
  }
  return parseFollowingLeague(rows, currentUserId);
};
