import { createSign } from 'node:crypto';

/**
 * 구글 서비스 계정으로 API 접근 토큰을 받는다 — GA4 Data API·Search Console API 공용.
 *
 * 서비스 계정 = "사람 대신 서버가 쓰는 구글 계정". 사람처럼 로그인 화면을 거치지 않고,
 * 비밀키로 서명한 JWT(자기소개서)를 구글에 내밀어 1시간짜리 접근 토큰과 바꾼다.
 *
 * googleapis SDK 를 쓰지 않는 이유: 필요한 건 "JWT 서명 → 토큰 교환" 한 번뿐인데 SDK 는
 * 수십 MB 다. node:crypto 로 직접 서명하면 의존성 0, 흐름도 코드에 그대로 보인다.
 *
 * `fetch` 를 인자로 받는 이유: 테스트에서 가짜 fetch 로 요청 모양만 확인하려고.
 */

type Fetch = typeof fetch;

export type GoogleServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

/** 설정이 비어 있다 — 빠진 변수 이름을 함께 들고 다닌다(화면이 "무엇이 빠졌는지" 말하게) */
export class GoogleConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`구글 연동 환경변수가 없습니다: ${missing.join(', ')}`);
  }
}

export const getGoogleServiceAccount = (): GoogleServiceAccount => {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  if (!clientEmail || !rawKey) {
    throw new GoogleConfigError(
      [
        !clientEmail && 'GOOGLE_SA_CLIENT_EMAIL',
        !rawKey && 'GOOGLE_SA_PRIVATE_KEY',
      ].filter((name): name is string => Boolean(name))
    );
  }
  // Vercel 환경변수에 키를 한 줄로 붙여 넣으면 줄바꿈이 글자 "\n" 으로 들어온다 — 진짜 줄바꿈으로 되돌린다
  return { clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') };
};

/**
 * API 마다 필요한 추가 변수(속성 ID 등)와 서비스 계정 변수 중 빠진 이름을 한 번에 모은다.
 * 하나씩 알려 주면 "고치고 배포 → 다음 것이 빠짐"을 여러 번 반복하게 된다.
 */
export const missingGoogleConfig = (extraMissing: string[]): string[] => {
  try {
    getGoogleServiceAccount();
    return extraMissing;
  } catch (e) {
    if (e instanceof GoogleConfigError) return [...extraMissing, ...e.missing];
    throw e;
  }
};

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64url');

/** 구글에 낼 JWT 를 만든다 — header.claims.서명 (RS256) */
export const buildSignedJwt = (
  account: GoogleServiceAccount,
  scopes: string[],
  now: Date
): string => {
  const iat = Math.floor(now.getTime() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail, // 누가
      scope: scopes.join(' '), // 무엇을 하려고
      aud: TOKEN_URL, // 누구에게 내는 서류인지
      iat,
      exp: iat + 3600, // 구글이 허용하는 최대 1시간
    })
  );
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(account.privateKey);
  return `${header}.${claims}.${base64url(signature)}`;
};

export const getGoogleAccessToken = async (
  scopes: string[],
  fetchImpl: Fetch = fetch
): Promise<string> => {
  const assertion = buildSignedJwt(
    getGoogleServiceAccount(),
    scopes,
    new Date()
  );
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`구글 토큰 발급 실패 (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token?: unknown };
  if (typeof json.access_token !== 'string') {
    throw new Error('구글 토큰 응답에 access_token 이 없습니다');
  }
  return json.access_token;
};
