import { NextRequest } from 'next/server';

import { sendKakaoAlert } from '@/shared/lib/kakao-alert/kakaoAlertSender';
import { getKakaoAlertConfig } from '@/shared/lib/kakao-alert/kakaoApi';
import {
  type SentryEventAlertPayload,
  toAlertText,
  verifySentrySignature,
} from '@/shared/lib/kakao-alert/sentryAlert';
import { loadKakaoTokens, saveKakaoTokens } from '@/shared/lib/kakao-alert/tokenStore';

import { errorResponse, successResponse } from '../../_helpers/response';

/**
 * POST /api/alerts/sentry
 * Sentry 알림 규칙(Internal Integration 의 Alert Rule Action)이 부르는 웹훅 → 운영자 카톡.
 *
 * 응답 코드 원칙:
 * - 서명이 틀리면 401. 위조 요청이다.
 * - 서명이 맞으면 카톡 발송이 실패해도 200. 5xx 를 주면 Sentry 가 다시 보내고, 같은 실패가
 *   반복되며 쌓인다. 실패는 로그(console.error → Sentry 이슈)와 어드민 화면으로 본다.
 *
 * ⚠️ 발송 실패를 console.error 로 남기면 그 자체가 Sentry 이슈가 되어 이 웹훅을 다시 부른다.
 *    같은 문구라 "새 이슈"는 한 번뿐이므로 고리는 한 바퀴에서 멈춘다.
 */
export const dynamic = 'force-dynamic';

const ALERT_RESOURCE = 'event_alert';

export async function POST(request: NextRequest) {
  const secret = process.env.SENTRY_ALERT_CLIENT_SECRET;
  if (!secret) {
    // 비밀이 없으면 아무 요청이나 통과시키게 되므로 닫는다(fail-closed). 로그는 errorResponse 가 남긴다
    return errorResponse('SENTRY_ALERT_CLIENT_SECRET 이 설정되지 않았습니다.', 500);
  }

  // 서명은 "받은 그대로의 본문"으로 계산해야 한다 — json() 으로 먼저 파싱하면 원문이 사라진다
  const rawBody = await request.text();
  if (!verifySentrySignature(rawBody, request.headers.get('sentry-hook-signature'), secret)) {
    return errorResponse('서명이 올바르지 않습니다.', 401);
  }

  // 설치·이슈 상태 변경 같은 다른 웹훅도 같은 주소로 올 수 있다. 알림 규칙 발동만 처리한다
  const resource = request.headers.get('sentry-hook-resource');
  if (resource !== ALERT_RESOURCE) {
    return successResponse({ ignored: resource });
  }

  const payload = JSON.parse(rawBody) as SentryEventAlertPayload;
  try {
    await sendKakaoAlert(
      { config: getKakaoAlertConfig(), load: loadKakaoTokens, save: saveKakaoTokens },
      {
        text: toAlertText(payload),
        linkUrl: new URL('/admin/errors', request.nextUrl.origin).toString(),
        buttonTitle: '에러 화면 열기',
      }
    );
    return successResponse({ sent: true });
  } catch (e) {
    console.error('[sentry-alert] 카카오 발송 실패:', e);
    return successResponse({ sent: false });
  }
}
