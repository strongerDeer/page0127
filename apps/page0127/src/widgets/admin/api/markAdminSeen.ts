'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

/**
 * 회원 관리를 "지금 봤다"고 남긴다 → 메뉴의 새 회원 배지가 0이 된다.
 *
 * 'layout' 으로 다시 그리는 이유: 배지는 어드민 레이아웃이 읽는데, 레이아웃은 메뉴를 옮겨도
 * 다시 그려지지 않는다. 페이지만 다시 그리면 숫자가 그대로 남는다.
 */
export async function markMembersSeen(): Promise<void> {
  await assertAdmin();
  const { error } = await createAdminClient()
    .from('admin_seen_marks')
    .upsert({ key: 'members', seen_at: new Date().toISOString() });
  if (error) {
    // 배지가 안 줄어들 뿐 화면이 죽을 일은 아니다
    console.error('[admin] 회원 확인 시각 저장 실패:', error.message);
    return;
  }
  revalidatePath('/admin', 'layout');
}
