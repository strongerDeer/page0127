import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { isCurrentlySuspended } from '../lib/suspension';

export type MemberDetail = {
  id: string;
  email: string | null;
  nickname: string | null;
  username: string | null;
  createdAt: string;
  bookCount: number;
  aiUsageCount: number;
  suspended: boolean;
  suspendedUntil: string | null;
};

export async function getMemberDetail(
  id: string
): Promise<MemberDetail | null> {
  await assertAdmin();
  const supabase = createAdminClient();

  const { data: p, error } = await supabase
    .from('profiles')
    .select(
      'id, email, nickname, username, created_at, status, suspended_until'
    )
    .eq('id', id)
    .single();
  // PGRST116 = 행 없음(존재하지 않는 회원) — 정상 케이스라 로그하지 않는다.
  if (error && error.code !== 'PGRST116')
    console.error('[admin] 회원 상세 조회 실패:', error.message);
  if (!p) return null;

  const [books, usage] = await Promise.all([
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
    supabase
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
  ]);
  if (books.error)
    console.error('[admin] 상세 등록 책 수 조회 실패:', books.error.message);
  if (usage.error)
    console.error('[admin] 상세 AI 사용 조회 실패:', usage.error.message);

  return {
    id: p.id,
    email: p.email,
    nickname: p.nickname,
    username: p.username,
    createdAt: p.created_at,
    bookCount: books.count ?? 0,
    aiUsageCount: usage.count ?? 0,
    suspended: isCurrentlySuspended(p.status, p.suspended_until, new Date()),
    suspendedUntil: p.suspended_until,
  };
}
