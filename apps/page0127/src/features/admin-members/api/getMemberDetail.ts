import { createAdminClient } from '@/shared/config/supabase/admin';

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

export async function getMemberDetail(id: string): Promise<MemberDetail | null> {
  const supabase = createAdminClient();

  const { data: p } = await supabase
    .from('profiles')
    .select('id, email, nickname, username, created_at, status, suspended_until')
    .eq('id', id)
    .single();
  if (!p) return null;

  const [books, usage] = await Promise.all([
    supabase.from('books').select('id', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('user_id', id),
  ]);

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
