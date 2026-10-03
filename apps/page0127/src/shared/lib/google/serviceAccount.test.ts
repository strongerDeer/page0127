import { createVerify, generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildSignedJwt,
  getGoogleAccessToken,
  getGoogleServiceAccount,
  GoogleConfigError,
} from './serviceAccount';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getGoogleServiceAccount', () => {
  it('빠진 변수 이름을 모두 들고 실패한다', () => {
    vi.stubEnv('GOOGLE_SA_CLIENT_EMAIL', '');
    vi.stubEnv('GOOGLE_SA_PRIVATE_KEY', '');
    try {
      getGoogleServiceAccount();
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GoogleConfigError);
      expect((e as GoogleConfigError).missing).toEqual([
        'GOOGLE_SA_CLIENT_EMAIL',
        'GOOGLE_SA_PRIVATE_KEY',
      ]);
    }
  });

  it('한 줄로 붙여 넣은 키의 글자 "\\n" 을 줄바꿈으로 되돌린다', () => {
    vi.stubEnv('GOOGLE_SA_CLIENT_EMAIL', 'sa@p.iam.gserviceaccount.com');
    vi.stubEnv('GOOGLE_SA_PRIVATE_KEY', privateKey.replace(/\n/g, '\\n'));
    expect(getGoogleServiceAccount().privateKey).toBe(privateKey);
  });
});

describe('buildSignedJwt', () => {
  it('공개키로 검증되는 RS256 서명과 1시간 만료를 담는다', () => {
    const jwt = buildSignedJwt(
      { clientEmail: 'sa@p.iam.gserviceaccount.com', privateKey },
      ['scope-a', 'scope-b'],
      new Date('2026-10-04T00:00:00Z')
    );
    const [header, claims, sig] = jwt.split('.');

    const ok = createVerify('RSA-SHA256')
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(sig, 'base64url'));
    expect(ok).toBe(true);

    const body = JSON.parse(Buffer.from(claims, 'base64url').toString());
    expect(body).toMatchObject({
      iss: 'sa@p.iam.gserviceaccount.com',
      scope: 'scope-a scope-b',
      aud: 'https://oauth2.googleapis.com/token',
    });
    expect(body.exp - body.iat).toBe(3600);
  });
});

describe('getGoogleAccessToken', () => {
  it('JWT 를 토큰 주소에 내고 access_token 을 돌려준다', async () => {
    vi.stubEnv('GOOGLE_SA_CLIENT_EMAIL', 'sa@p.iam.gserviceaccount.com');
    vi.stubEnv('GOOGLE_SA_PRIVATE_KEY', privateKey);
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({ access_token: 'tok' }))
    );

    await expect(getGoogleAccessToken(['s'], fakeFetch)).resolves.toBe('tok');
    const [url, init] = fakeFetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(String(init.body)).toContain(
      'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer'
    );
  });

  it('구글이 거절하면 상태 코드와 본문을 담아 실패한다', async () => {
    vi.stubEnv('GOOGLE_SA_CLIENT_EMAIL', 'sa@p.iam.gserviceaccount.com');
    vi.stubEnv('GOOGLE_SA_PRIVATE_KEY', privateKey);
    const fakeFetch = vi.fn(
      async () => new Response('invalid_grant', { status: 400 })
    );
    await expect(getGoogleAccessToken(['s'], fakeFetch)).rejects.toThrow(
      '구글 토큰 발급 실패 (400): invalid_grant'
    );
  });
});
