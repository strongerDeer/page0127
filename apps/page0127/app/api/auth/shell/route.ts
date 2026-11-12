import { getVerifiedUser } from '@/shared/lib/auth/getVerifiedUser';

import { getShellUser } from '@/widgets/AppShell';

import { getSupabaseClient } from '../../_helpers/auth';
import { errorResponse, successResponse } from '../../_helpers/response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/shell — 캐시되는 공개 페이지(책 정보·소개·약관)의 GNB 가 쓸 내 프로필.
 *
 * 왜 따로 있나: 그 페이지들은 CDN 에 미리 만들어 두려고(ISR) 서버에서 쿠키를 읽지 않는다.
 * 쿠키를 읽는 순간 Next 가 "사람마다 다른 페이지"로 보고 캐시를 끄기 때문이다.
 * 그래서 GNB 의 사진·이름은 브라우저가 로그인을 확인한 뒤에만 이 API 로 받는다
 * (비로그인이면 부르지 않는다 — ClientAppShellLayout).
 */
export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    const user = await getVerifiedUser(supabase.auth);
    const response = successResponse(user ? await getShellUser(user.id) : null);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch {
    const response = errorResponse(
      '로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      503
    );
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
