import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { getAdminEmails, isAdminEmail } from '@/shared/lib/admin/config';
import {
  type AttributionLike,
  signupChannelLabel,
} from '@/shared/lib/attribution/signupChannel';
import { toKstDateKey } from '@/shared/lib/date';
import { applyTokenSearch } from '@/shared/lib/tokenSearch';

import {
  countVisitedSince,
  type MemberSort,
  signupNumbers,
  sortMembers,
} from '../lib/memberList';
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

/** "최근 7일 접속" 구간 — 오늘 포함 7일 */
const WEEK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type MemberExclusion = 'admin' | 'demo' | 'test';

export type MemberRow = {
  id: string;
  /** 가입 순서 번호(1번 = 첫 가입자). 실제 회원끼리만 센다 — 테스트·체험·운영자는 null */
  number: number | null;
  /** 가려진 이메일(dre***@gmail.com). 원문은 이 타입에 아예 싣지 않는다 */
  maskedEmail: string | null;
  nickname: string | null;
  username: string | null;
  createdAt: string;
  bookCount: number;
  suspended: boolean;
  /** 'google' | 'kakao' 등. Auth 조회 실패 시 null */
  provider: string | null;
  /**
   * 처음 들어온 길("인스타그램", "네이버", "기타 (brunch.co.kr)").
   * 2026-11-24(signup_attributions) 이전 가입자·쿠키가 없던 가입은 '기록 없음'.
   */
  signupChannel: string;
  /** 최근 접속일(KST). 30일 안 방문 기록 → 없으면 마지막 로그인 시각으로 대신한다 */
  lastSeen: string | null;
  /** 최근 30일 중 들어온 날 수 */
  activeDays: number;
  /**
   * 지표에서 빠지는 계정이면 그 이유 — 운영자(ADMIN_EMAILS)·체험(is_demo)·테스트(is_test).
   * 이런 계정은 실제 회원 표가 아니라 아래 따로 모은 표에 나온다. 진짜 회원이면 null.
   */
  excludedAs: MemberExclusion | null;
};

export type MemberList = {
  /** 이번 페이지의 실제 회원 */
  rows: MemberRow[];
  /** 실제 회원 수(검색 중이면 검색 결과 중 실제 회원 수) */
  total: number;
  /** 테스트·체험·운영자 계정 — 몇 개 안 되므로 페이지 없이 전부 */
  excluded: MemberRow[];
  /** 실제 회원 중 최근 7일·30일(오늘 포함) 안에 접속한 사람 수. 검색과 무관하게 전체 기준 */
  visited: { week: number; month: number } | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  nickname: string | null;
  username: string | null;
  created_at: string;
  status: string;
  suspended_until: string | null;
  is_demo: boolean | null;
  is_test: boolean | null;
};

/**
 * 회원 관리 목록.
 *
 * 흐름: 회원 전부 읽기 → 테스트·체험·운영자 나누기 → 30일 방문 기록으로 최근 접속·활동일 계산
 *   → 가입 순서 번호 → 정렬 → 페이지 자르기 → 이번 페이지 사람만 책 수·Auth 정보 붙이기.
 * 정렬 기준(최근 접속·활동일)이 profiles 칸이 아니라서 DB에서 잘라 올 수 없다 — lib/memberList.ts 참고.
 */
export async function getMembers(opts: {
  search?: string;
  sort?: MemberSort;
  page?: number;
  pageSize?: number;
}): Promise<MemberList> {
  await assertAdmin();
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = opts.page ?? 1;
  const now = new Date();

  const [profiles, visitRows] = await Promise.all([
    readAllProfiles(opts.search),
    readRecentVisits(now),
  ]);
  const visits = summarizeVisits(visitRows ?? []);

  // 1) 나누기 — 어드민 홈 지표(getAdminUserIds)와 같은 기준
  const adminEmails = getAdminEmails();
  const exclusionOf = (p: ProfileRow): MemberExclusion | null =>
    isAdminEmail(p.email, adminEmails)
      ? 'admin'
      : p.is_demo
        ? 'demo'
        : p.is_test
          ? 'test'
          : null;

  const withVisits = profiles.map((p) => {
    const v = visits.get(p.id);
    return {
      profile: p,
      id: p.id,
      createdAt: p.created_at,
      lastVisit: v?.lastVisit ?? null,
      activeDays: v?.activeDays ?? 0,
      excludedAs: exclusionOf(p),
    };
  });
  const real = withVisits.filter((m) => m.excludedAs === null);
  const excluded = withVisits.filter((m) => m.excludedAs !== null);

  // 2) 번호는 정렬과 상관없이 가입 순서로 고정
  const numbers = signupNumbers(real);

  // 3) 정렬 → 페이지
  const sorted = sortMembers(real, opts.sort ?? 'joined');
  const from = (page - 1) * pageSize;
  const pageMembers = sorted.slice(from, from + pageSize);
  const excludedSorted = sortMembers(excluded, 'joined');

  // 4) 화면에 나올 사람만 책 수·Auth 정보를 붙인다(Auth 는 한 명씩 불러야 해서 비싸다)
  const shownIds = [...pageMembers, ...excludedSorted].map((m) => m.id);
  const [bookCounts, authInfo, attributions] = await Promise.all([
    getBookCounts(shownIds),
    getAuthInfo(shownIds),
    getAttributions(shownIds),
  ]);

  const toRow = (m: (typeof withVisits)[number]): MemberRow => {
    const p = m.profile;
    const auth = authInfo.get(p.id);
    return {
      id: p.id,
      number: numbers.get(p.id) ?? null,
      maskedEmail: maskEmail(p.email),
      nickname: p.nickname,
      username: p.username,
      createdAt: p.created_at,
      bookCount: bookCounts.get(p.id) ?? 0,
      suspended: isCurrentlySuspended(p.status, p.suspended_until, now),
      provider: auth?.provider ?? null,
      signupChannel: signupChannelLabel(attributions.get(p.id) ?? null),
      lastSeen:
        m.lastVisit ??
        (auth?.lastSignInAt ? toKstDateKey(new Date(auth.lastSignInAt)) : null),
      activeDays: m.activeDays,
      excludedAs: m.excludedAs,
    };
  };

  // 접속자 수는 검색어와 무관한 전체 기준이어야 한다 — 검색 중이면 따로 세지 않는다
  const weekSince = toKstDateKey(
    new Date(now.getTime() - (WEEK_DAYS - 1) * DAY_MS)
  );
  const monthSince = toKstDateKey(
    new Date(now.getTime() - (ACTIVE_WINDOW_DAYS - 1) * DAY_MS)
  );

  return {
    rows: pageMembers.map(toRow),
    total: real.length,
    excluded: excludedSorted.map(toRow),
    visited:
      opts.search || visitRows === null
        ? null
        : {
            week: countVisitedSince(real, weekSince),
            month: countVisitedSince(real, monthSince),
          },
  };
}

/** 회원 전부(검색어가 있으면 맞는 사람만). 1,000행 상한을 넘어도 끝까지 읽는다 */
async function readAllProfiles(search?: string): Promise<ProfileRow[]> {
  const supabase = createAdminClient();
  const all: ProfileRow[] = [];
  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    let query = supabase
      .from('profiles')
      .select(
        'id, email, nickname, username, created_at, status, suspended_until, is_demo, is_test'
      )
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    // 검색어의 단어가 모두 (이메일이나 닉네임에) 들어간 회원.
    // applyTokenSearch 가 값을 따옴표로 감싸므로 쉼표·괄호를 지울 필요가 없다.
    if (search) query = applyTokenSearch(query, search, ['email', 'nickname']);

    const { data, error } = await query;
    if (error) {
      console.error('[admin] 회원 목록 조회 실패:', error.message);
      break;
    }
    all.push(...(data as ProfileRow[]));
    if (data.length < POSTGREST_MAX_ROWS) break;
  }
  return all;
}

/**
 * 최근 30일(오늘 포함) 방문 기록 전부. 하루 한 사람 한 줄이라 회원 100명이어도 최대 3,000행.
 * 실패하면 null — 접속자 수를 0 으로 뭉개면 "아무도 안 왔다"와 구분이 안 된다.
 */
async function readRecentVisits(
  now: Date
): Promise<{ user_id: string; visit_date: string }[] | null> {
  const supabase = createAdminClient();
  const since = toKstDateKey(
    new Date(now.getTime() - (ACTIVE_WINDOW_DAYS - 1) * DAY_MS)
  );
  const all: { user_id: string; visit_date: string }[] = [];
  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await supabase
      .from('user_daily_visits')
      .select('user_id, visit_date')
      .gte('visit_date', since)
      .order('visit_date', { ascending: false })
      .order('user_id')
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    if (error) {
      console.error('[admin] 방문 기록 조회 실패:', error.message);
      return null;
    }
    all.push(...data);
    if (data.length < POSTGREST_MAX_ROWS) return all;
  }
}

/** 등록 책 수 — 화면에 나올 사람만 */
/** 가입 때 저장한 첫 방문 출처(signup_attributions). 실패하면 빈 Map — 전부 '기록 없음'으로 보인다 */
async function getAttributions(
  ids: string[]
): Promise<Map<string, NonNullable<AttributionLike>>> {
  const map = new Map<string, NonNullable<AttributionLike>>();
  if (ids.length === 0) return map;
  const { data, error } = await createAdminClient()
    .from('signup_attributions')
    .select('user_id, source, medium, referrer_host')
    .in('user_id', ids);
  if (error) {
    console.error('[admin] 가입 출처 조회 실패:', error.message);
    return map;
  }
  for (const r of data)
    map.set(r.user_id as string, r as NonNullable<AttributionLike>);
  return map;
}

async function getBookCounts(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const supabase = createAdminClient();
  for (let from = 0; ; from += POSTGREST_MAX_ROWS) {
    const { data, error } = await supabase
      .from('books')
      .select('user_id')
      .in('user_id', ids)
      .order('id')
      .range(from, from + POSTGREST_MAX_ROWS - 1);
    if (error) {
      console.error('[admin] 등록 책 수 조회 실패:', error.message);
      return counts;
    }
    for (const b of data)
      counts.set(b.user_id, (counts.get(b.user_id) ?? 0) + 1);
    if (data.length < POSTGREST_MAX_ROWS) return counts;
  }
}

/**
 * 가입 경로·마지막 로그인은 profiles 가 아니라 auth.users 에 있다.
 * Auth 관리 API 는 id 목록 조회를 지원하지 않아 한 명씩 병렬로 부른다(한 페이지 최대 50회 + 제외 계정 몇 개).
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
