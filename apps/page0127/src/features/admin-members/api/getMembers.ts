import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { isCurrentlySuspended } from '../lib/suspension';

// 목록 페이지 크기 — 페이지네이션 UI(page.tsx)와 공유해 두 곳이 어긋나지 않게 한다.
export const DEFAULT_PAGE_SIZE = 50;

export type MemberRow = {
  id: string;
  email: string | null;
  nickname: string | null;
  username: string | null;
  createdAt: string;
  bookCount: number;
  suspended: boolean;
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
  const rows: MemberRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    nickname: p.nickname,
    username: p.username,
    createdAt: p.created_at,
    bookCount: counts.get(p.id) ?? 0,
    suspended: isCurrentlySuspended(p.status, p.suspended_until, now),
  }));

  return { rows, total: count ?? 0 };
}
