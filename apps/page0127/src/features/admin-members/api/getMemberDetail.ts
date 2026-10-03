import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { maskEmail } from '../lib/memberStats';
import { isCurrentlySuspended } from '../lib/suspension';

export type AdminActionLog = {
  id: string;
  adminEmail: string;
  action: string;
  reason: string | null;
  createdAt: string;
};

export type MemberDetail = {
  id: string;
  /** 원문은 싣지 않는다 — RevealEmail 버튼(열람 기록 남김)으로만 받는다 */
  maskedEmail: string | null;
  nickname: string | null;
  username: string | null;
  createdAt: string;
  bookCount: number;
  aiUsageCount: number;
  suspended: boolean;
  suspendedUntil: string | null;
  provider: string | null;
  lastSignInAt: string | null;
  /** 이 회원에 대한 최근 관리자 행위(정지·해제·이메일 열람) */
  recentActions: AdminActionLog[];
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

  const [books, usage, authUser, actions] = await Promise.all([
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
    supabase
      .from('ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id),
    supabase.auth.admin.getUserById(id),
    supabase
      .from('admin_actions')
      .select('id, admin_email, action, reason, created_at')
      .eq('target_user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  if (books.error)
    console.error('[admin] 상세 등록 책 수 조회 실패:', books.error.message);
  if (usage.error)
    console.error('[admin] 상세 AI 사용 조회 실패:', usage.error.message);
  if (authUser.error)
    console.error('[admin] 상세 Auth 조회 실패:', authUser.error.message);
  if (actions.error)
    console.error('[admin] 상세 관리 기록 조회 실패:', actions.error.message);

  const provider = authUser.data.user?.app_metadata.provider;

  return {
    id: p.id,
    maskedEmail: maskEmail(p.email),
    nickname: p.nickname,
    username: p.username,
    createdAt: p.created_at,
    bookCount: books.count ?? 0,
    aiUsageCount: usage.count ?? 0,
    suspended: isCurrentlySuspended(p.status, p.suspended_until, new Date()),
    suspendedUntil: p.suspended_until,
    provider: typeof provider === 'string' ? provider : null,
    lastSignInAt: authUser.data.user?.last_sign_in_at ?? null,
    recentActions: (actions.data ?? []).map((a) => ({
      id: a.id,
      adminEmail: a.admin_email,
      action: a.action,
      reason: a.reason,
      createdAt: a.created_at,
    })),
  };
}
