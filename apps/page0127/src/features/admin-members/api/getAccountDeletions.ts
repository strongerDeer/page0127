import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

export type AccountDeletion = {
  deletedAt: string;
  signedUpAt: string | null;
  bookCount: number;
  provider: string | null;
};

/**
 * 탈퇴 기록 — 2026-10-31 부터 쌓인다(그 전 탈퇴는 하드 삭제라 남은 게 없다).
 * 개인정보를 지우는 탈퇴라 누구였는지는 남기지 않고, 언제·얼마나 쓰다 떠났는지만 본다.
 * 실패하면 null.
 */
export async function getAccountDeletions(
  limit = 20
): Promise<{ total: number; recent: AccountDeletion[] } | null> {
  await assertAdmin();
  const { data, count, error } = await createAdminClient()
    .from('account_deletions')
    .select('deleted_at, signed_up_at, book_count, provider', {
      count: 'exact',
    })
    .order('deleted_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[admin] 탈퇴 기록 조회 실패:', error.message);
    return null;
  }
  return {
    total: count ?? 0,
    recent: data.map((d) => ({
      deletedAt: d.deleted_at,
      signedUpAt: d.signed_up_at,
      bookCount: d.book_count,
      provider: d.provider,
    })),
  };
}
