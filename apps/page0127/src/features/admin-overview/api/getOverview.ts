import { createAdminClient } from '@/shared/config/supabase/admin';

import {
  kstDateToUtcEnd,
  kstDateToUtcStart,
  resolveMetricPeriod,
} from '../lib/period';

/**
 * 어드민 홈이 매일 아침 보여줄 숫자.
 *
 * 지금까지 홈은 링크 카드 세 장뿐이라, "어제 몇 명 왔고 몇 권 등록됐나"를 보려면
 * 화면을 다섯 개 돌아야 했다. 매일 볼 것은 한 화면에 있어야 실제로 매일 본다.
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

  members: { total: number; yesterday: number };
  books: { total: number; yesterday: number };
  completions: { yesterday: number };
  /** 방문자 — user_daily_visits 는 하루 한 사람 한 줄이라 그대로 세면 DAU 다 */
  visitors: { yesterday: number; last7Days: number; today: number };
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
  const { today, yesterday, weekStart } = resolveMetricPeriod(new Date());

  const yStart = kstDateToUtcStart(yesterday);
  const yEnd = kstDateToUtcEnd(yesterday);

  const [
    pendingReports,
    membersTotal,
    membersYesterday,
    booksTotal,
    booksYesterday,
    completionsYesterday,
    visitorsYesterday,
    visitorsWeek,
    visitorsToday,
  ] = await Promise.all([
    countRows(() =>
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
    ),
    countRows(() =>
      supabase.from('profiles').select('id', { count: 'exact', head: true })
    ),
    countRows(() =>
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', yStart)
        .lt('created_at', yEnd)
    ),
    countRows(() =>
      supabase.from('books').select('id', { count: 'exact', head: true })
    ),
    countRows(() =>
      supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', yStart)
        .lt('created_at', yEnd)
    ),
    // 완독은 completed_date(날짜 컬럼)를 본다. status 만 보면 "어제 완독으로
    // 바꾼 것"이 아니라 "지금 완독 상태인 것"을 세게 된다.
    countRows(() =>
      supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('completed_date', yesterday)
    ),
    countRows(() =>
      supabase
        .from('user_daily_visits')
        .select('user_id', { count: 'exact', head: true })
        .eq('visit_date', yesterday)
    ),
    // 최근 7일은 **연인원**이다(같은 사람이 3일 오면 3). 순 방문자가 아니라는
    // 것을 화면 문구로도 밝힌다 — 둘을 헷갈리면 재방문율을 잘못 읽는다.
    countRows(() =>
      supabase
        .from('user_daily_visits')
        .select('user_id', { count: 'exact', head: true })
        .gte('visit_date', weekStart)
        .lte('visit_date', yesterday)
    ),
    countRows(() =>
      supabase
        .from('user_daily_visits')
        .select('user_id', { count: 'exact', head: true })
        .eq('visit_date', today)
    ),
  ]);

  return {
    yesterday,
    today,
    pendingReports,
    members: { total: membersTotal, yesterday: membersYesterday },
    books: { total: booksTotal, yesterday: booksYesterday },
    completions: { yesterday: completionsYesterday },
    visitors: {
      yesterday: visitorsYesterday,
      last7Days: visitorsWeek,
      today: visitorsToday,
    },
  };
};
