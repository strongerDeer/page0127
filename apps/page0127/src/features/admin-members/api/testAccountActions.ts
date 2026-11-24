'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

/**
 * 테스트 계정 표시 켜기/끄기 — 켜면 회원 수·활성 지표·탈퇴 기록에서 빠진다.
 *
 * 왜 서버 액션인가: profiles.is_test 는 DB 트리거(protect_profile_moderation_columns)가
 * 사용자 키로는 못 바꾸게 막는다. 바꿀 수 있는 건 service_role 뿐이라, 서버에서
 * 관리자임을 확인(assertAdmin)한 뒤 service_role 로 쓴다. 정지·해제와 같은 길이다.
 *
 * 누가 언제 바꿨는지는 admin_actions 에 남긴다 — 회원 수가 갑자기 줄면 이 기록으로 설명된다.
 */
export async function setTestAccount(
  targetUserId: string,
  isTest: boolean
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('profiles')
    .update({ is_test: isTest })
    .eq('id', targetUserId);
  if (error) throw new Error(`테스트 계정 표시 실패: ${error.message}`);

  const { error: logErr } = await supabase.from('admin_actions').insert({
    admin_email: admin.email,
    target_user_id: targetUserId,
    action: isTest ? 'mark_test' : 'unmark_test',
  });
  if (logErr) throw new Error(`감사 로그 기록 실패: ${logErr.message}`);

  revalidatePath(`/admin/members/${targetUserId}`);
  revalidatePath('/admin/members');
  revalidatePath('/admin');
}
