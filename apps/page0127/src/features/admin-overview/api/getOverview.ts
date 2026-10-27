import { createAdminClient } from '@/shared/config/supabase/admin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import {
  type ActivitySummary,
  type BetaStatus,
  summarizeActivity,
  summarizeBeta,
  type Visit,
} from '../lib/activity';
import {
  kstDateToUtcEnd,
  kstDateToUtcStart,
  resolveMetricPeriod,
} from '../lib/period';
import { fetchAll } from './fetchAll';

/**
 * 어드민 홈이 매일 아침 보여줄 숫자.
 *
 * 지금까지 홈은 링크 카드 세 장뿐이라, "어제 몇 명 왔고 몇 권 등록됐나"를 보려면
 * 화면을 다섯 개 돌아야 했다. 매일 볼 것은 한 화면에 있어야 실제로 매일 본다.
 *
 * 전부 운영자(ADMIN_EMAILS)를 뺀다 — 베타 10명 사이에 운영자가 책 10권을 넣으면
 * "어제 등록 10권"이 되어 반응을 잘못 읽는다. 퍼널·재방문과 같은 사람들을 세야 숫자가 맞는다.
 *
 * service_role 로 읽는다 — RLS 는 본인 것만 보여주므로 전체 집계가 안 된다.
 * (admin-members·admin-reports 와 같은 경로)
 */

export type AdminOverview = {
  /** 집계 기준일 (KST). 화면에 박아 "언제까지의 숫자인지" 밝힌다 */
  yesterday: string;
  today: string;

  /** 지금 사람이 처리해야 하는 것 — 0 이 아니면 화면이 이걸 먼저 말한다 */
  pendingReports: number;

  /** DAU·WAU·MAU·고착도 (로그인 회원, 순 사용자). 조회 실패면 null */
  activity: ActivitySummary | null;
  /** 베타 현황 (사람 단위). 조회 실패면 null */
  beta: BetaStatus | null;

  members: { yesterday: number };
  books: { total: number; yesterday: number };
  completions: { yesterday: number };
};

/** count 전용 조회 — head:true 라 행을 안 가져온다 */
const countRows = async (
  build: () => PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> => {
  const { count, error } = await build();
  if (error) {
    // 지표 하나가 실패해도 화면 전체가 죽지 않게 0 으로 떨어뜨린다.
    // 조용히 0 이 되면 "진짜 0" 과 구분이 안 되므로 로그는 남긴다.
    console.error('어드민 지표 조회 실패:', error);
    return 0;
  }
  return count ?? 0;
};

export const getOverview = async (): Promise<AdminOverview> => {
  const supabase = createAdminClient();
  const period = resolveMetricPeriod(new Date());
  const { today, yesterday, monthStart } = period;

  const yStart = kstDateToUtcStart(yesterday);
  const yEnd = kstDateToUtcEnd(yesterday);

  const adminIds = await getAdminUserIds();
  const notAdmin = adminIds.length > 0 ? toInFilter(adminIds) : null;

  // 운영자 제외 조건 — 테이블마다 사람을 가리키는 컬럼 이름이 다르다
  const profiles = () => {
    const q = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    return notAdmin ? q.not('id', 'in', notAdmin) : q;
  };
  const books = () => {
    const q = supabase
      .from('books')
      .select('id', { count: 'exact', head: true });
    return notAdmin ? q.not('user_id', 'in', notAdmin) : q;
  };

  const [
    pendingReports,
    membersYesterday,
    booksTotal,
    booksYesterday,
    completionsYesterday,
    visits,
    memberRows,
    bookOwners,
    pushOwners,
  ] = await Promise.all([
    countRows(() =>
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ),
    countRows(() =>
      profiles().gte('created_at', yStart).lt('created_at', yEnd)
    ),
    countRows(() => books()),
    countRows(() => books().gte('created_at', yStart).lt('created_at', yEnd)),
    // 완독은 completed_date(날짜 컬럼)를 본다. status 만 보면 "어제 완독으로
    // 바꾼 것"이 아니라 "지금 완독 상태인 것"을 세게 된다.
    countRows(() =>
      books().eq('status', 'completed').eq('completed_date', yesterday)
    ),
    // 30일 방문 기록 — 하루 한 사람 한 줄이라 50명 × 31일이어도 1,550줄
    fetchAll<Visit>((from, to) => {
      let q = supabase
        .from('user_daily_visits')
        .select('user_id, visit_date')
        .gte('visit_date', monthStart)
        .lte('visit_date', today);
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q.order('visit_date').order('user_id').range(from, to);
    }, 'overview-visits'),
    fetchAll<{ id: string; created_at: string }>((from, to) => {
      let q = supabase.from('profiles').select('id, created_at');
      if (notAdmin) q = q.not('id', 'in', notAdmin);
      return q.order('created_at').order('id').range(from, to);
    }, 'overview-members'),
    // 책을 넣은 사람만 알면 된다. 운영자 책(수백 권)은 빼고 읽는다
    fetchAll<{ user_id: string }>((from, to) => {
      let q = supabase.from('books').select('user_id');
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q.order('id').range(from, to);
    }, 'overview-book-owners'),
    fetchAll<{ user_id: string }>((from, to) => {
      let q = supabase.from('push_subscriptions').select('user_id');
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q.order('id').range(from, to);
    }, 'overview-push'),
  ]);

  return {
    yesterday,
    today,
    pendingReports,
    activity: visits ? summarizeActivity(visits, period) : null,
    beta:
      visits && memberRows && bookOwners
        ? summarizeBeta(
            memberRows.map((m) => ({
              id: m.id,
              createdAt: toKstDateKey(new Date(m.created_at)),
            })),
            bookOwners.map((b) => b.user_id),
            visits,
            period,
            // 푸시 조회만 실패하면 0 으로 — 나머지 현황까지 가리지 않는다
            (pushOwners ?? []).map((p) => p.user_id)
          )
        : null,
    members: { yesterday: membersYesterday },
    books: { total: booksTotal, yesterday: booksYesterday },
    completions: { yesterday: completionsYesterday },
  };
};
