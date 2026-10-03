import { NextResponse } from 'next/server';

import { getAdminUser } from '@/shared/lib/admin/assertAdmin';
import { buildAuthorizeUrl, getKakaoAlertConfig } from '@/shared/lib/kakao-alert/kakaoApi';

import { KAKAO_ALERT_STATE_COOKIE } from '../state';

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

export async function GET() {
  // 어드민이 아니면 존재 자체를 숨긴다(404)
  if (!(await getAdminUser())) {
    return new NextResponse(null, { status: 404 });
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildAuthorizeUrl(getKakaoAlertConfig(), state));
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
