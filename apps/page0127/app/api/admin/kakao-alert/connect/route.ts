import { NextRequest, NextResponse } from 'next/server';

import { getAdminUser } from '@/shared/lib/admin/assertAdmin';
import {
  buildAuthorizeUrl,
  getKakaoAlertConfig,
  KakaoAlertConfigError,
} from '@/shared/lib/kakao-alert/kakaoApi';

import { KAKAO_ALERT_STATE_COOKIE, kakaoAlertReturnUrl } from '../state';

/**
 * GET /api/admin/kakao-alert/connect
 * 카카오 알림 연결 시작 — 운영자를 카카오 동의 화면(talk_message)으로 보낸다.
 *
 * 학습 포인트 — OAuth 의 state:
 * 동의 화면에서 돌아오는 callback 은 "누가 보낸 요청인지" 스스로 알 수 없다.
 * 남이 자기 카카오 계정의 인가 코드를 담은 링크를 운영자에게 누르게 하면, 알림이
 * **그 사람 카톡으로** 연결될 수 있다(로그인 CSRF). 그래서 떠나기 전에 무작위 값을
 * 쿠키에 심고 같은 값을 state 로 실어 보낸 뒤, 돌아왔을 때 둘이 같은지 확인한다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 어드민이 아니면 존재 자체를 숨긴다(404)
  if (!(await getAdminUser())) {
    return new NextResponse(null, { status: 404 });
  }

  let config;
  try {
    config = getKakaoAlertConfig();
  } catch (e) {
    if (!(e instanceof KakaoAlertConfigError)) throw e;
    // 설정 누락은 운영 실수라 Sentry 에도 남긴다. 화면에는 브라우저 기본 500 대신
    // 어드민으로 돌려보내 빠진 이름을 보여 준다(2026-10-03 실제로 500 만 보고 헤맸다).
    console.error('[kakao-alert] 연결 시작 실패:', e.message);
    return NextResponse.redirect(
      kakaoAlertReturnUrl(request.nextUrl.origin, 'error', 'missing_env', e.missing)
    );
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildAuthorizeUrl(config, state));
  response.cookies.set(KAKAO_ALERT_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // 카카오에서 돌아오는 요청은 다른 사이트에서 시작된 이동이라 strict 면 쿠키가 안 실린다
    sameSite: 'lax',
    path: '/api/admin/kakao-alert',
    maxAge: 10 * 60,
  });
  return response;
}
