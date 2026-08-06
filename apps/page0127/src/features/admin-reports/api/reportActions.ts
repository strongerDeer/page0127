'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

/**
 * 신고 처리 — 숨김/해제와 신고 상태를 함께 쓴다.
 *
 * 둘을 따로 두면 "댓글은 가렸는데 신고는 미처리로 남는" 상태가 생기고, 운영자가
 * 같은 건을 두 번 본다. 한 액션에 묶어 항상 같이 움직이게 한다.
 */

/** 댓글을 가리고 신고를 처리 완료로 넘긴다 */
export async function hideComment(
  reportId: string,
  commentId: string
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();

  const { error: hideError } = await supabase
    .from('book_comments')
    .update({ is_hidden: true })
    .eq('id', commentId);
  if (hideError) throw new Error(`댓글 숨김 실패: ${hideError.message}`);

  // 같은 댓글에 달린 다른 신고도 함께 정리한다 — 이미 조치했는데 목록에 남아
  // 있으면 운영자가 같은 건을 다시 본다.
  const { error: statusError } = await supabase
    .from('reports')
    .update({
      status: 'resolved',
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
    })
    .eq('comment_id', commentId)
    .eq('status', 'pending');
  if (statusError) throw new Error(`신고 상태 갱신 실패: ${statusError.message}`);

  revalidatePath('/admin/reports');
}

/** 숨김을 되돌린다. 신고는 '반려'로 남긴다 — 지우지 않아야 이력이 남는다 */
export async function unhideComment(
  reportId: string,
  commentId: string
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();

  const { error: unhideError } = await supabase
    .from('book_comments')
    .update({ is_hidden: false })
    .eq('id', commentId);
  if (unhideError) throw new Error(`숨김 해제 실패: ${unhideError.message}`);

  const { error: statusError } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (statusError) throw new Error(`신고 상태 갱신 실패: ${statusError.message}`);

  revalidatePath('/admin/reports');
}

/** 문제없는 신고를 반려한다 (댓글은 그대로 둔다) */
export async function rejectReport(reportId: string): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (error) throw new Error(`신고 반려 실패: ${error.message}`);

  revalidatePath('/admin/reports');
}
