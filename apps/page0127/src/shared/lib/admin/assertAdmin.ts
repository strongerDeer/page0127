import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { getAdminEmails, isAdminEmail } from '@/shared/lib/admin/config';

import type { User } from '@supabase/supabase-js';

/**
 * 현재 요청 유저가 관리자인지 확인한다.
 *
 * 진짜 보안 경계 — admin 레이아웃과 모든 admin 서버액션 첫 줄에서 호출한다.
 * 관리자가 아니면(비로그인 포함) notFound()로 404 → admin 존재 자체를 숨긴다.
 *
 * 여기서는 신원 확인만 하므로 일반 createClient(쿠키 세션)로 충분하다.
 * 실제 데이터 조회는 호출부에서 createAdminClient(RLS 우회)를 쓴다.
 */
export async function assertAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // notFound()는 never를 반환하므로 이후 user는 non-null로 좁혀진다
  if (!user || !isAdminEmail(user.email, getAdminEmails())) {
    notFound();
  }
  return user;
}
