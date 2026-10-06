import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { toKstDateKey } from '@/shared/lib/date';

import { kstDateToUtcStart } from '../lib/period';
import { bucketByDay, type TrendPoint, trendStart } from '../lib/trend';

// PostgREST 는 한 번에 최대 1,000행만 돌려준다 — 넘으면 에러 없이 잘린다
const PAGE = 1000;

export type AdminTrends = {
  /** 날짜별 방문자(DAU) — user_daily_visits 는 하루 한 사람 한 줄 */
  visitors: TrendPoint[];
  signups: TrendPoint[];
  books: TrendPoint[];
};

/**
 * 1,000행 상한을 넘어도 끝까지 읽는다. 30일 방문 기록은 사용자가 34명만 넘어도 1,000행을 넘는다.
 * 실패하면 null — 빈 배열로 뭉개면 "그 기간 0건"과 구분이 안 된다.
 */
const fetchAll = async <T>(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  label: string
): Promise<T[] | null> => {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) {
      console.error(`[admin] 추이 조회 실패(${label}):`, error.message);
      return null;
    }
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
};

/**
 * 홈의 "최근 30일 추이" — 날짜만 가져와 서버에서 센다.
 * DB 에 날짜별 집계 함수를 두지 않은 이유: 마이그레이션 없이 되고, 30일치 날짜 몇천 줄은
 * 어드민 한 명이 보는 화면에서 충분히 가볍다. 행이 수만을 넘으면 RPC 로 옮길 때다.
 */
export async function getTrends(now = new Date()): Promise<AdminTrends | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const since = trendStart(now);
  const sinceUtc = kstDateToUtcStart(since);

  const [visits, profiles, books] = await Promise.all([
    fetchAll<{ visit_date: string }>(
      (from, to) =>
        supabase
          .from('user_daily_visits')
          .select('visit_date')
          .gte('visit_date', since)
          .order('visit_date')
          .order('user_id')
          .range(from, to),
      'visits'
    ),
    fetchAll<{ created_at: string }>(
      (from, to) =>
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', sinceUtc)
          .order('created_at')
          .order('id')
          .range(from, to),
      'profiles'
    ),
    fetchAll<{ created_at: string }>(
      (from, to) =>
        supabase
          .from('books')
          .select('created_at')
          .gte('created_at', sinceUtc)
          .order('created_at')
          .order('id')
          .range(from, to),
      'books'
    ),
  ]);

  if (!visits || !profiles || !books) return null;

  // timestamptz 는 KST 날짜로 바꿔 센다 — UTC 로 자르면 KST 오전 9시 전 가입이 전날로 샌다
  const toKey = (r: { created_at: string }) =>
    toKstDateKey(new Date(r.created_at));
  return {
    visitors: bucketByDay(
      visits.map((v) => v.visit_date),
      now
    ),
    signups: bucketByDay(profiles.map(toKey), now),
    books: bucketByDay(books.map(toKey), now),
  };
}
