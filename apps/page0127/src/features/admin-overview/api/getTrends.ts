import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  comparableRange,
  type DateRange,
  previousRange,
} from '@/shared/lib/admin/dateRange';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import { kstDateToUtcEnd, kstDateToUtcStart } from '../lib/period';
import { bucketByDay, type TrendPoint } from '../lib/trend';
import { fetchAll } from './fetchAll';

export type AdminTrends = {
  /** 날짜별 방문자(DAU) — user_daily_visits 는 하루 한 사람 한 줄. 관리자 제외 */
  visitors: TrendPoint[];
  signups: TrendPoint[];
  books: TrendPoint[];
  /**
   * 증감 비교용 합계 — 오늘(집계 중)을 뺀 끝난 날들(comparable)과 그 바로 앞 같은 길이(previous).
   * 오늘 하루만 고르면 견줄 날이 없어 null
   */
  comparison: {
    current: { visitors: number; signups: number; books: number };
    previous: { visitors: number; signups: number; books: number };
  } | null;
};

/** 날짜 키 중 기간 안에 드는 개수 */
const countIn = (keys: string[], r: DateRange): number =>
  keys.filter((k) => k >= r.from && k <= r.to).length;

/**
 * 홈의 기간별 추이 — 날짜만 가져와 서버에서 센다.
 * 앞 기간과 비교하려고 **앞 기간 시작부터** 한 번에 읽고 서버에서 가른다(조회 수를 늘리지 않는다).
 * DB 에 날짜별 집계 함수를 두지 않은 이유: 마이그레이션 없이 되고, 몇 달치 날짜 몇천 줄은
 * 어드민 한 명이 보는 화면에서 충분히 가볍다. 행이 수만을 넘으면 RPC 로 옮길 때다.
 */
export async function getTrends(range: DateRange): Promise<AdminTrends | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const comparable = comparableRange(range);
  // 앞 기간은 "끝난 날" 기준 — 오늘이 들면 길이가 하루 짧아진다. 오늘 하루면 어제와 견주지 않는다
  const previous = previousRange(comparable ?? range);
  const sinceUtc = kstDateToUtcStart(previous.from);
  const untilUtc = kstDateToUtcEnd(range.to);
  const adminIds = await getAdminUserIds();

  const [visits, profiles, books] = await Promise.all([
    fetchAll<{ visit_date: string }>((from, to) => {
      let q = supabase
        .from('user_daily_visits')
        .select('visit_date')
        .gte('visit_date', previous.from)
        .lte('visit_date', range.to);
      if (adminIds.length > 0) q = q.not('user_id', 'in', toInFilter(adminIds));
      return q.order('visit_date').order('user_id').range(from, to);
    }, 'visits'),
    // 가입·책도 운영자를 뺀다 — 아래 퍼널과 같은 사람들을 세야 두 숫자가 맞는다
    fetchAll<{ created_at: string }>((from, to) => {
      let q = supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sinceUtc)
        .lt('created_at', untilUtc);
      if (adminIds.length > 0) q = q.not('id', 'in', toInFilter(adminIds));
      return q.order('created_at').order('id').range(from, to);
    }, 'profiles'),
    fetchAll<{ created_at: string }>((from, to) => {
      let q = supabase
        .from('books')
        .select('created_at')
        .gte('created_at', sinceUtc)
        .lt('created_at', untilUtc);
      if (adminIds.length > 0) q = q.not('user_id', 'in', toInFilter(adminIds));
      return q.order('created_at').order('id').range(from, to);
    }, 'books'),
  ]);

  if (!visits || !profiles || !books) return null;

  // timestamptz 는 KST 날짜로 바꿔 센다 — UTC 로 자르면 KST 오전 9시 전 가입이 전날로 샌다
  const toKey = (r: { created_at: string }) =>
    toKstDateKey(new Date(r.created_at));
  const visitKeys = visits.map((v) => v.visit_date);
  const signupKeys = profiles.map(toKey);
  const bookKeys = books.map(toKey);
  return {
    visitors: bucketByDay(visitKeys, range),
    signups: bucketByDay(signupKeys, range),
    books: bucketByDay(bookKeys, range),
    comparison: comparable && {
      current: {
        visitors: countIn(visitKeys, comparable),
        signups: countIn(signupKeys, comparable),
        books: countIn(bookKeys, comparable),
      },
      previous: {
        visitors: countIn(visitKeys, previous),
        signups: countIn(signupKeys, previous),
        books: countIn(bookKeys, previous),
      },
    },
  };
}
