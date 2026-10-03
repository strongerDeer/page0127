import type { KakaoTokenResponse } from './tokens';

/**
 * 카카오 REST API 호출 — 토큰 발급·갱신, "나에게 보내기".
 *
 * `fetch` 를 인자로 받는 이유: 테스트에서 가짜 fetch 를 넣어 요청 모양만 확인하려고.
 * 운영에서는 기본값(전역 fetch)이 쓰인다.
 *
 * 로그인용 카카오 앱과 **다른 앱**(알림 전용)의 키를 쓴다. 같은 앱에 talk_message 동의를
 * 붙이면 로그인 동의 화면이 바뀔 수 있어서다. 환경변수 이름에 ALERT 를 넣어 구분한다.
 */

type Fetch = typeof fetch;

export type KakaoAlertConfig = {
  /** 알림 전용 카카오 앱의 REST API 키 */
  restApiKey: string;
  /** [보안] > Client Secret. 카카오는 기본으로 켜져 있다 */
  clientSecret: string;
  /** 인가 코드를 받을 주소 — 카카오 콘솔의 Redirect URI 와 글자 하나까지 같아야 한다 */
  redirectUri: string;
};

/**
 * 설정이 비어 있다 — 빠진 변수 이름을 함께 들고 다닌다.
 *
 * 2026-10-03 운영에서 Vercel 팀 공용 변수를 프로젝트에 연결하지 않아 이 에러가 났는데,
 * 연결 라우트가 그대로 던져 브라우저 기본 500 화면만 떴다. 이름을 들고 있어야 라우트가
 * 어드민 화면으로 돌려보내며 "무엇이 빠졌는지"를 보여 줄 수 있다.
 */
export class KakaoAlertConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`카카오 알림 환경변수가 없습니다: ${missing.join(', ')}`);
  }
}

/** 환경변수에서 설정을 읽는다. 하나라도 비면 무엇이 비었는지 말하며 실패한다 */
export const getKakaoAlertConfig = (): KakaoAlertConfig => {
  const restApiKey = process.env.KAKAO_ALERT_REST_API_KEY;
  const clientSecret = process.env.KAKAO_ALERT_CLIENT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!restApiKey || !clientSecret || !siteUrl) {
    throw new KakaoAlertConfigError(
      [
        !restApiKey && 'KAKAO_ALERT_REST_API_KEY',
        !clientSecret && 'KAKAO_ALERT_CLIENT_SECRET',
        !siteUrl && 'NEXT_PUBLIC_SITE_URL',
      ].filter((name): name is string => Boolean(name))
    );
  }

  return {
    restApiKey,
    clientSecret,
    redirectUri: new URL('/api/admin/kakao-alert/callback', siteUrl).toString(),
  };
};

const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const MEMO_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';
/** 텍스트 템플릿의 본문 한도 */
export const KAKAO_TEXT_MAX = 200;

/** 동의 화면 주소. scope=talk_message 가 "나에게 보내기" 권한이다 */
export const buildAuthorizeUrl = (config: KakaoAlertConfig, state: string): string => {
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.restApiKey);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', 'talk_message');
  url.searchParams.set('state', state);
  return url.toString();
};

const postToken = async (body: URLSearchParams, fetchFn: Fetch): Promise<KakaoTokenResponse> => {
  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  if (!res.ok) {
    // 응답 본문에 error_code(KOE…)가 담겨 원인을 알려 준다 — 토큰 값은 들어 있지 않다
    throw new Error(`카카오 토큰 요청 실패(${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as KakaoTokenResponse;
};

/** 인가 코드 → 첫 토큰 (최초 연결 때 한 번) */
export const exchangeCode = (config: KakaoAlertConfig, code: string, fetchFn: Fetch = fetch) =>
  postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.restApiKey,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
    fetchFn
  );

/** 리프레시 토큰 → 새 액세스 토큰 (+ 남은 기간이 1달 미만이면 새 리프레시 토큰) */
export const refreshTokens = (config: KakaoAlertConfig, refreshToken: string, fetchFn: Fetch = fetch) =>
  postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.restApiKey,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
    fetchFn
  );

/** "나에게 보내기"가 액세스 토큰 문제로 거절됐다 — 갱신 후 한 번 더 보낼 근거가 된다 */
export class KakaoUnauthorizedError extends Error {}

/**
 * 나에게 보내기(텍스트 템플릿).
 *
 * ⚠️ link 의 도메인은 카카오 콘솔 [앱] > [제품 링크 관리] > [웹 도메인]에 등록돼 있어야 한다.
 *    등록 안 된 도메인이면 메시지는 가지만 누르면 열리지 않는다.
 */
export const sendMemo = async (
  accessToken: string,
  message: { text: string; linkUrl: string; buttonTitle?: string },
  fetchFn: Fetch = fetch
): Promise<void> => {
  const templateObject = {
    object_type: 'text',
    // 한도를 넘기면 요청 자체가 거절되므로 잘라서 보낸다
    text:
      message.text.length > KAKAO_TEXT_MAX
        ? `${message.text.slice(0, KAKAO_TEXT_MAX - 1)}…`
        : message.text,
    link: { web_url: message.linkUrl, mobile_web_url: message.linkUrl },
    button_title: message.buttonTitle ?? '열기',
  };

  const res = await fetchFn(MEMO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });

  if (res.status === 401) throw new KakaoUnauthorizedError('카카오 액세스 토큰이 거절됐습니다.');
  if (!res.ok) throw new Error(`카카오 나에게 보내기 실패(${res.status}): ${await res.text()}`);
};
