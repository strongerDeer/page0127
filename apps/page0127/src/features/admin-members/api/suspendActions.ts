'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { computeBan, type SuspendInput } from '../lib/suspension';

/**
 * 정지: 실제 차단(Auth ban) + 표시 미러(profiles) + 감사 로그를 함께 쓴다.
 * 세 가지가 항상 같이 실행되도록 한 액션에 묶는다(동기화 드리프트 최소화).
 */
export async function suspendUser(
  targetUserId: string,
  input: SuspendInput,
  reason: string
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();
  const { banDuration, suspendedUntil } = computeBan(input, new Date());

  // 1) 실제 차단
  const { error: banErr } = await supabase.auth.admin.updateUserById(
    targetUserId,
    { ban_duration: banDuration }
  );
  if (banErr) throw new Error(`정지 실패: ${banErr.message}`);

  // 2) 표시용 미러
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ status: 'suspended', suspended_until: suspendedUntil })
    .eq('id', targetUserId);
  if (profileErr) throw new Error(`상태 미러 갱신 실패: ${profileErr.message}`);

  // 3) 감사 로그
  const { error: logErr } = await supabase.from('admin_actions').insert({
    admin_email: admin.email,
    target_user_id: targetUserId,
    action: 'suspend',
    reason: reason || null,
    duration_days: input.kind === 'days' ? input.days : null,
  });
  if (logErr) throw new Error(`감사 로그 기록 실패: ${logErr.message}`);

  revalidatePath(`/admin/members/${targetUserId}`);
  revalidatePath('/admin/members');
}

export async function unsuspendUser(
  targetUserId: string,
  reason: string
): Promise<void> {
  const admin = await assertAdmin();
  const supabase = createAdminClient();

  const { error: banErr } = await supabase.auth.admin.updateUserById(
    targetUserId,
    { ban_duration: 'none' }
  );
  if (banErr) throw new Error(`해제 실패: ${banErr.message}`);

  const { error: profileErr2 } = await supabase
    .from('profiles')
    .update({ status: 'active', suspended_until: null })
    .eq('id', targetUserId);
  if (profileErr2)
    throw new Error(`상태 미러 갱신 실패: ${profileErr2.message}`);

  const { error: logErr2 } = await supabase.from('admin_actions').insert({
    admin_email: admin.email,
    target_user_id: targetUserId,
    action: 'unsuspend',
    reason: reason || null,
    duration_days: null,
  });
  if (logErr2) throw new Error(`감사 로그 기록 실패: ${logErr2.message}`);

  revalidatePath(`/admin/members/${targetUserId}`);
  revalidatePath('/admin/members');
}
