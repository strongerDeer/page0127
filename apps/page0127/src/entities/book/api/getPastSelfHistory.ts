import { getSeoulToday } from '../model/libraryPeriod';
import { calculatePastSelfHistory } from '../model/pastSelfBattle';

import type { PastSelfRow } from '../model/pastSelfBattle';
import type { SupabaseClient } from '@supabase/supabase-js';

const COLUMNS =
  'id,user_id,isbn,status,is_public,completed_date,completed_year,created_at,read_count,is_life_book,page_count';
/** 상대의 독서 행을 받지 않고, RLS 안에서 본인 공개 기록만 비교한다. */
export const getPastSelfHistory = async (
  client: SupabaseClient,
  userId: string,
  today = getSeoulToday()
) => {
  const rows: PastSelfRow[] = [];
  let total: number | undefined;
  const previousYear = Number(today.slice(0, 4)) - 1;
  for (let offset = 0; ;) {
    const { data, error, count } = await client
      .from('books')
      .select(COLUMNS, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_public', true)
      .eq('status', 'completed')
      .or(
        `completed_date.gte.${previousYear}-01-01,completed_year.gte.${previousYear}`
      )
      .order('id', { ascending: true })
      .range(offset, offset + 249);
    if (error)
      throw new Error('지난 독서 기록을 불러오지 못했어요.', { cause: error });
    if (
      !Array.isArray(data) ||
      count === null ||
      !Number.isInteger(count) ||
      count < 0 ||
      (total !== undefined && total !== count)
    )
      throw new Error('지난 독서 기록의 범위를 확인하지 못했어요.');
    total = count;
    rows.push(...(data as PastSelfRow[]));
    if (rows.length === total) break;
    if (data.length === 0 || rows.length > total)
      throw new Error('지난 독서 기록 일부를 불러오지 못했어요.');
    offset += data.length;
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error('독서 기록이 변경됐어요. 다시 불러와 주세요.');
  return calculatePastSelfHistory(rows, userId, today);
};
