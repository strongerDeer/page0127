import { NextRequest } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';

import { getCurrentUser } from '../../_helpers/auth';
import { isPushConfigured } from '../../_helpers/push';
import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * /api/push/subscriptions — 이 기기의 웹푸시 구독을 등록·해제한다.
 *
 * push_subscriptions 는 service_role 전용 테이블이다(마이그레이션 20261022000001 참조).
 * 로그인은 여기서 확인하고, 쓰기는 관리자 클라이언트로 한다 — 같은 브라우저에서
 * 계정을 바꿔 다시 켜면 endpoint 는 같고 주인만 바뀌는데, RLS 로는 남의 행을
 * 넘겨받을 수 없기 때문이다.
 */

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

/** 푸시 서비스 주소는 https 여야 한다 — 아무 주소나 받으면 서버가 그곳으로 요청을 보내게 된다 */
const isPushEndpoint = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const isKey = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 256;

/**
 * POST — 구독 등록(또는 다른 계정에서 넘겨받기)
 * body: PushSubscription.toJSON() 그대로 ({ endpoint, keys: { p256dh, auth } })
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    if (!isPushConfigured()) {
      return errorResponse('푸시 알림이 준비되지 않은 환경입니다.', 503);
    }

    const body = (await request
      .json()
      .catch(() => null)) as SubscriptionBody | null;
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (!isPushEndpoint(endpoint) || !isKey(p256dh) || !isKey(auth)) {
      return errorResponse('구독 정보가 올바르지 않습니다.', 400);
    }

    const admin = createAdminClient();
    const { error } = await admin.from('push_subscriptions').upsert(
      {
        user_id: user!.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 512) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('푸시 구독 저장 실패:', error);
      return errorResponse('푸시 구독 저장에 실패했습니다.');
    }

    return successResponse({ subscribed: true }, 201);
  } catch (error) {
    console.error('POST /api/push/subscriptions error:', error);
    return errorResponse('푸시 구독 저장에 실패했습니다.');
  }
}

/**
 * DELETE — 이 기기의 구독 해제. 내 것만 지운다. 없는 구독을 지워도 성공(멱등)
 * body: { endpoint }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser();
    if (authError) return authError;

    const body = (await request
      .json()
      .catch(() => null)) as SubscriptionBody | null;
    if (!isPushEndpoint(body?.endpoint)) {
      return errorResponse('구독 정보가 올바르지 않습니다.', 400);
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', body.endpoint)
      .eq('user_id', user!.id);

    if (error) {
      console.error('푸시 구독 삭제 실패:', error);
      return errorResponse('푸시 구독 해제에 실패했습니다.');
    }

    return successResponse({ subscribed: false });
  } catch (error) {
    console.error('DELETE /api/push/subscriptions error:', error);
    return errorResponse('푸시 구독 해제에 실패했습니다.');
  }
}
