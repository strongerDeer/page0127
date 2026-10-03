import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { toKstDateKey } from '@/shared/lib/date';

import {
  ACTIVE_WINDOW_DAYS,
  maskEmail,
  summarizeVisits,
} from '../lib/memberStats';
import { isCurrentlySuspended } from '../lib/suspension';

// 목록 페이지 크기 — 페이지네이션 UI(page.tsx)와 공유해 두 곳이 어긋나지 않게 한다.
export const DEFAULT_PAGE_SIZE = 50;

// PostgREST 는 한 번에 최대 1,000행만 돌려준다 — 넘으면 에러 없이 잘린다
const POSTGREST_MAX_ROWS = 1000;

export type MemberRow = {
  id: string;
  /** 가려진 이메일(dre***@gmail.com). 원문은 이 타입에 아예 싣지 않는다 */
  maskedEmail: string | null;
  nickname: string | null;
  username: string | null;
  createdAt: string;
  bookCount: number;
  suspended: boolean;
  /** 'google' | 'kakao' 등. Auth 조회 실패 시 null */
  provider: string | null;
  /** 최근 접속일(KST). 30일 안 방문 기록 → 없으면 마지막 로그인 시각으로 대신한다 */
  lastSeen: string | null;
  /** 최근 30일 중 들어온 날 수 */
  activeDays: number;
};

export async function getMembers(opts: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: MemberRow[]; total: number }> {
  await assertAdmin();
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = opts.page ?? 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = createAdminClient();

  let query = supabase
    .from('profiles')
    .select(
      'id, email, nickname, username, created_at, status, suspended_until',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (opts.search) {
    // PostgREST or 필터 파괴 방지: 쉼표·괄호 제거
    const safe = opts.search.replace(/[,()]/g, '');
    query = query.or(`email.ilike.%${safe}%,nickname.ilike.%${safe}%`);
  }

  const { data: profiles, count, error } = await query;
  if (error) console.error('[admin] 회원 목록 조회 실패:', error.message);
  const ids = (profiles ?? []).map((p) => p.id);

  // 등록 책 수 — 이번 페이지 유저만 (관리자 저트래픽이라 클라이언트 집계로 충분)
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('user_id')
      .in('user_id', ids);
    if (booksError)
      console.error('[admin] 등록 책 수 조회 실패:', booksError.message);
    for (const b of books ?? []) {
      counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1);
    }
  }

  const now = new Date();
  const [visits, authInfo] = await Promise.all([
    getRecentVisits(ids, now),
    getAuthInfo(ids),
  ]);

  const rows: MemberRow[] = (profiles ?? []).map((p) => {
    const v = visits.get(p.id);
    const auth = authInfo.get(p.id);
    return {
      id: p.id,
      maskedEmail: maskEmail(p.email),
      nickname: p.nickname,
      username: p.username,
      createdAt: p.created_at,
      bookCount: counts.get(p.id) ?? 0,
      suspended: isCurrentlySuspended(p.status, p.suspended_until, now),
      provider: auth?.provider ?? null,
      lastSeen:
        v?.lastVisit ??
        (auth?.lastSignInAt ? toKstDateKey(new Date(auth.lastSignInAt)) : null),
      activeDays: v?.activeDays ?? 0,
    };
  });

  return { rows, total: count ?? 0 };
}

/** 최근 30일 방문 기록 → 회원별 { 활동일 수, 마지막 방문일 } */
async function getRecentVisits(ids: string[], now: Date) {
  if (ids.length === 0) return summarizeVisits([]);
  const supabase = createAdminClient();
  const since = toKstDateKey(
    new Date(now.getTime() - (ACTIVE_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000)
  );

  // 50명 × 30일이면 1,000행 상한을 넘을 수 있어 range 로 나눠 끝까지 읽는다
  const all: { user_id: string; visit_date: string }[] = [];
  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await supabase
      .from('user_daily_visits')
      .select('user_id, visit_date')
      .in('user_id', ids)
      .gte('visit_date', since)
      .order('visit_date', { ascending: false })
      .order('user_id')
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    if (error) {
      console.error('[admin] 방문 기록 조회 실패:', error.message);
      break;
    }
    all.push(...data);
    if (data.length < POSTGREST_MAX_ROWS) break;
  }
  return summarizeVisits(all);
}

/**
 * 가입 경로·마지막 로그인은 profiles 가 아니라 auth.users 에 있다.
 * Auth 관리 API 는 id 목록 조회를 지원하지 않아 한 명씩 병렬로 부른다(한 페이지 최대 50회).
 */
async function getAuthInfo(ids: string[]) {
  const supabase = createAdminClient();
  const results = await Promise.all(
    ids.map((id) => supabase.auth.admin.getUserById(id))
  );

  const map = new Map<
    string,
    { provider: string | null; lastSignInAt: string | null }
  >();
  results.forEach(({ data, error }, i) => {
    if (error || !data.user) {
      console.error('[admin] Auth 회원 정보 조회 실패:', error?.message);
      return;
    }
    const provider = data.user.app_metadata.provider;
    map.set(ids[i], {
      provider: typeof provider === 'string' ? provider : null,
      lastSignInAt: data.user.last_sign_in_at ?? null,
    });
  });
  return map;
}
