import { NextRequest } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { getAdminEmails, isAdminEmail } from '@/shared/lib/admin/config';
import { getVerifiedUser } from '@/shared/lib/auth/getVerifiedUser';
import { isDemoUser } from '@/shared/lib/demo/demoAccount';

import { getSupabaseClient } from '../../_helpers/auth';
import { successResponse } from '../../_helpers/response';

import type { RecordingPolicy } from '@/shared/lib/analytics/clarity';

const NONE: RecordingPolicy = { excluded: false, demo: false };

/**
 * GET /api/auth/recording
 * 지금 로그인한 계정을 Clarity 녹화에서 뺄지 알려 준다. (RecordingExclusionReporter 가 부른다)
 *
 * 왜 /auth/me 에 넣지 않고 따로 두나:
 *   /auth/me 는 창에 다시 들어올 때마다(refetchOnWindowFocus) 불린다. is_test 는
 *   authenticated 에 SELECT 권한이 없는 열이라 service_role 로 DB 를 한 번 더 읽어야 하는데,
 *   그 조회를 매번 얹을 이유가 없다. 이 판정은 기기에 표시를 남기면 끝나므로
 *   "세션마다 한 번"이면 충분하다.
 *
 * 실패해도 녹화를 막을 만큼 중요한 값은 아니라서, 오류는 "제외 아님"으로 답한다(200).
 */
export async function GET(_request: NextRequest) {
  const policy = await resolvePolicy();
  const response = successResponse(policy);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

async function resolvePolicy(): Promise<RecordingPolicy> {
  try {
    const supabase = await getSupabaseClient();
    const user = await getVerifiedUser(supabase.auth);
    if (!user) return NONE;

    if (isDemoUser(user)) return { excluded: false, demo: true };
    // 관리자는 이메일만으로 판정된다 — DB 를 읽지 않는다
    if (isAdminEmail(user.email, getAdminEmails()))
      return { excluded: true, demo: false };

    // 테스트 계정: profiles.is_test 는 service_role 만 읽을 수 있다(20261124000000).
    // 본인 id 한 줄만 읽으므로 다른 사람 정보가 새어 나갈 일은 없다.
    const { data, error } = await createAdminClient()
      .from('profiles')
      .select('is_test')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('[recording] 테스트 계정 확인 실패:', error.message);
      return NONE;
    }
    return { excluded: data?.is_test === true, demo: false };
  } catch {
    return NONE;
  }
}
