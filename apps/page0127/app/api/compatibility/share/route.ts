import { NextRequest } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';

import { decideShare } from '@/entities/compatibility/model/share';

import { getCurrentUser } from '../../_helpers/auth';
import { schedulePush } from '../../_helpers/push';
import { errorResponse, successResponse } from '../../_helpers/response';

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * POST /api/compatibility/share — 케미 결과를 상대에게 알린다(2026-11-24 HJ A안).
 *
 * Body: { analysisId: string }
 * - 분석한 사람(requested_by)만 부를 수 있다. 결과에 shared_at 을 채우면 RLS 가 상대에게도 결과를 연다.
 * - 알림은 서버만 넣는다(service_role) — 사용자 키 INSERT 정책은 20261124000700 에서 지웠다.
 * - 이미 알린 결과는 다시 알림을 만들지 않는다(연타·새로고침 중복 방지).
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getCurrentUser();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const analysisId = body?.analysisId;
  if (typeof analysisId !== 'string' || !UUID.test(analysisId)) {
    return errorResponse('알릴 케미 결과를 찾지 못했어요.', 400);
  }

  const admin = createAdminClient();
  const { data: analysis, error } = await admin
    .from('compatibility_analyses')
    .select('id, user_id_1, user_id_2, requested_by, shared_at')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) return errorResponse('케미 결과를 불러오지 못했어요.');
  if (!analysis) return errorResponse('알릴 케미 결과를 찾지 못했어요.', 404);

  const decision = decideShare(analysis, user!.id);
  if (decision.kind === 'forbidden') {
    return errorResponse('내가 분석한 결과만 알릴 수 있어요.', 403);
  }
  if (decision.kind === 'already') {
    return successResponse({ sharedAt: analysis.shared_at });
  }

  // shared_at 이 비어 있을 때만 채운다 — 두 요청이 겹쳐도 알림은 한 번만 간다
  const sharedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from('compatibility_analyses')
    .update({ shared_at: sharedAt })
    .eq('id', analysisId)
    .is('shared_at', null)
    .select('id');
  if (updateError) return errorResponse('결과를 알리지 못했어요.');
  if (!updated || updated.length === 0) {
    return successResponse({ sharedAt });
  }

  const { data: notification, error: notifyError } = await admin
    .from('notifications')
    .insert({
      user_id: decision.partnerId,
      actor_id: user!.id,
      type: 'chemistry',
    })
    .select('id')
    .single();
  if (notifyError) {
    // 결과는 이미 열렸다 — 상대가 케미 화면에 오면 보인다. 알림만 놓친 것이라 성공으로 답한다
    console.error('케미 공유 알림 저장 실패:', notifyError);
  } else {
    schedulePush([
      {
        id: notification.id,
        user_id: decision.partnerId,
        actor_id: user!.id,
        type: 'chemistry',
      },
    ]);
  }

  return successResponse({ sharedAt });
}
