'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

/**
 * 가려진 이메일의 원문을 돌려준다 — 열람 기록을 **먼저** 남기고, 기록에 실패하면 보여 주지 않는다.
 *
 * 왜 화면에 바로 안 싣고 버튼 + 서버액션인가:
 * 서버 컴포넌트가 원문을 렌더하면 페이지를 여는 것만으로 HTML 에 실린다(기록 없이 노출).
 * 버튼을 눌러야만 원문이 응답에 담기게 하면 "누가·언제·왜 봤는지"가 반드시 남는다.
 *
 * 비밀번호 재확인 대신 사유 입력인 이유: 관리자도 구글·카카오 로그인이라 비밀번호가 없다.
 */
export async function revealMemberEmail(
  targetUserId: string,
  reason: string
): Promise<string> {
  const admin = await assertAdmin();
  const trimmed = reason.trim();
  if (trimmed.length < 2) throw new Error('열람 사유를 입력해 주세요.');

  const supabase = createAdminClient();

  // 1) 감사 로그 — 실패하면 여기서 멈춘다(기록 없는 열람을 만들지 않는다)
  const { error: logErr } = await supabase.from('admin_actions').insert({
    admin_email: admin.email,
    target_user_id: targetUserId,
    action: 'view_email',
    reason: trimmed,
    duration_days: null,
  });
  if (logErr) throw new Error(`열람 기록 실패: ${logErr.message}`);

  // 2) 원문 조회
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', targetUserId)
    .single();
  if (error) throw new Error(`이메일 조회 실패: ${error.message}`);

  // 상세 화면의 "최근 관리 기록" 목록에 방금 열람이 바로 보이게 한다
  revalidatePath(`/admin/members/${targetUserId}`);
  return data.email ?? '(이메일 없음)';
}
