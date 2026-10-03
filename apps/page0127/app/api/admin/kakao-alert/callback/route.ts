import { NextRequest, NextResponse } from 'next/server';

import { getAdminUser } from '@/shared/lib/admin/assertAdmin';
import { sendKakaoAlert } from '@/shared/lib/kakao-alert/kakaoAlertSender';
import { exchangeCode, getKakaoAlertConfig } from '@/shared/lib/kakao-alert/kakaoApi';
import { toStoredTokens } from '@/shared/lib/kakao-alert/tokens';
import { loadKakaoTokens, saveKakaoTokens } from '@/shared/lib/kakao-alert/tokenStore';

import { KAKAO_ALERT_RETURN_PATH, KAKAO_ALERT_STATE_COOKIE } from '../state';

/**
 * GET /api/admin/kakao-alert/callback?code=…&state=…
 * 카카오 동의를 마치고 돌아오는 곳. 인가 코드를 토큰으로 바꿔 저장하고, 시험 메시지를 보낸다.
 *
 * 시험 메시지까지 보내는 이유: 저장만 하고 끝내면 "진짜 카톡이 오는지"는 첫 에러가 날 때까지
 * 모른다. 연결한 그 자리에서 카톡이 와야 연결이 끝난 것이다.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await getAdminUser())) {
    return new NextResponse(null, { status: 404 });
  }

  const back = (result: 'connected' | 'error', reason?: string) => {
    const url = new URL(KAKAO_ALERT_RETURN_PATH, request.nextUrl.origin);
    url.searchParams.set('kakao', result);
    if (reason) url.searchParams.set('reason', reason);
    const response = NextResponse.redirect(url);
    // state 는 한 번 쓰면 버린다 — 같은 링크로 다시 들어와도 통과하지 못하게
    response.cookies.delete({ name: KAKAO_ALERT_STATE_COOKIE, path: '/api/admin/kakao-alert' });
    return response;
  };

  const params = request.nextUrl.searchParams;
  // 사용자가 동의를 취소하면 code 대신 error 가 온다
  if (params.get('error')) return back('error', params.get('error') ?? 'denied');

  const state = params.get('state');
  const expected = request.cookies.get(KAKAO_ALERT_STATE_COOKIE)?.value;
  if (!state || !expected || state !== expected) return back('error', 'state_mismatch');

  const code = params.get('code');
  if (!code) return back('error', 'no_code');

  try {
    const config = getKakaoAlertConfig();
    const tokens = toStoredTokens(await exchangeCode(config, code), new Date());
    await saveKakaoTokens(tokens);

    await sendKakaoAlert(
      { config, load: loadKakaoTokens, save: saveKakaoTokens },
      {
        text: '✅ page0127 에러 알림이 연결됐습니다.\n앞으로 운영 에러가 나면 이 채팅으로 알려 드립니다.',
        linkUrl: new URL(KAKAO_ALERT_RETURN_PATH, request.nextUrl.origin).toString(),
        buttonTitle: '에러 화면 열기',
      }
    );
    return back('connected');
  } catch (e) {
    console.error('[kakao-alert] 연결 실패:', e);
    return back('error', 'exchange_failed');
  }
}
