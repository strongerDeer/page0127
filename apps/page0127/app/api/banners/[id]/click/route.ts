import { NextRequest } from 'next/server';

import { getSupabaseClient } from '../../../_helpers/auth';
import { internalErrorResponse, successResponse } from '../../../_helpers/response';

/**
 * POST /api/banners/[id]/click
 * 배너 클릭 1회를 센다.
 *
 * 로그인을 요구하지 않는다 — 배너는 비로그인에게도 보이고, 그쪽 클릭이 오히려
 * 더 중요하다(가입 전 사람이 무엇에 반응하는지).
 *
 * 집계 실패가 이동을 막으면 안 된다. 클라이언트는 응답을 기다리지 않고
 * 링크를 따라가고, 여기서는 어떤 경우에도 200 을 돌려준다 — 이 숫자는
 * 어드민이 눈으로 비교하는 참고값이지 정합성을 지켜야 하는 데이터가 아니다.
 *
 * 어떤 슬라이드를 셀지는 DB 가 정한다(increment_slide_click). 노출 조건을
 * 만족하는 것만 오르므로, 지난 배너 id 로 카운터를 부풀릴 수 없다.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await getSupabaseClient();

    const { error } = await supabase.rpc('increment_slide_click', {
      p_slide_id: id,
    });

    if (error) {
      // 집계는 실패해도 사용자 흐름과 무관하다. 원인은 남기되 200 으로 끝낸다.
      console.warn('[banner] 클릭 집계 실패:', error.message);
    }

    return successResponse({ ok: true });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
