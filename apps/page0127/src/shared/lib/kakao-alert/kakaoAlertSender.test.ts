import { describe, expect, it } from 'vitest';

import {
  type KakaoAlertDeps,
  KakaoNotConnectedError,
  sendKakaoAlert,
} from './kakaoAlertSender';

import type { StoredKakaoTokens } from './tokens';

const NOW = new Date('2026-10-03T00:00:00Z');
const config = { restApiKey: 'rest', clientSecret: 'secret', redirectUri: 'https://x/cb' };
const message = { text: '에러 발생', linkUrl: 'https://page0127.com/admin/errors' };

const fresh: StoredKakaoTokens = {
  accessToken: 'access-1',
  accessTokenExpiresAt: new Date('2026-10-03T06:00:00Z'),
  refreshToken: 'refresh-1',
  refreshTokenExpiresAt: new Date('2026-11-30T00:00:00Z'),
};

type Call = { url: string; body: string; auth: string | null };

/** 응답을 순서대로 돌려주고 요청을 기록하는 가짜 fetch */
const fakeFetch = (responses: Response[]) => {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(input), body: String(init?.body ?? ''), auth: headers.get('authorization') });
    const next = responses.shift();
    if (!next) throw new Error('예상보다 많이 호출됨');
    return next;
  }) as typeof fetch;
  return { fn, calls };
};

const ok = (body: unknown = { result_code: 0 }) => new Response(JSON.stringify(body), { status: 200 });
const tokenResponse = (access: string) => ok({ access_token: access, expires_in: 43199 });

const makeDeps = (stored: StoredKakaoTokens | null, fetchFn: typeof fetch) => {
  const saved: StoredKakaoTokens[] = [];
  const deps: KakaoAlertDeps = {
    config,
    load: async () => stored,
    save: async (t) => {
      saved.push(t);
    },
    fetchFn,
    now: () => NOW,
  };
  return { deps, saved };
};

describe('sendKakaoAlert', () => {
  it('토큰이 충분히 남았으면 갱신 없이 바로 보낸다', async () => {
    const { fn, calls } = fakeFetch([ok()]);
    const { deps, saved } = makeDeps(fresh, fn);

    await sendKakaoAlert(deps, message);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/talk/memo/default/send');
    expect(calls[0].auth).toBe('Bearer access-1');
    expect(saved).toHaveLength(0);
  });

  it('액세스 토큰이 곧 만료되면 갱신·저장한 뒤 새 토큰으로 보낸다', async () => {
    const expiring = { ...fresh, accessTokenExpiresAt: new Date('2026-10-03T00:05:00Z') };
    const { fn, calls } = fakeFetch([tokenResponse('access-2'), ok()]);
    const { deps, saved } = makeDeps(expiring, fn);

    await sendKakaoAlert(deps, message);

    expect(calls[0].url).toContain('/oauth/token');
    expect(calls[0].body).toContain('grant_type=refresh_token');
    expect(saved[0].accessToken).toBe('access-2');
    expect(saved[0].refreshToken).toBe('refresh-1'); // 새 리프레시 토큰이 안 왔으면 유지
    expect(calls[1].auth).toBe('Bearer access-2');
  });

  it('401 로 거절되면 갱신해서 딱 한 번만 다시 보낸다', async () => {
    const { fn, calls } = fakeFetch([
      new Response('{}', { status: 401 }),
      tokenResponse('access-2'),
      ok(),
    ]);
    const { deps } = makeDeps(fresh, fn);

    await sendKakaoAlert(deps, message);

    expect(calls.map((c) => c.auth ?? 'token')).toEqual(['Bearer access-1', 'token', 'Bearer access-2']);
  });

  it('재시도도 401 이면 더 시도하지 않고 실패한다', async () => {
    const { fn, calls } = fakeFetch([
      new Response('{}', { status: 401 }),
      tokenResponse('access-2'),
      new Response('{}', { status: 401 }),
    ]);
    const { deps } = makeDeps(fresh, fn);

    await expect(sendKakaoAlert(deps, message)).rejects.toThrow('거절');
    expect(calls).toHaveLength(3);
  });

  it('연결 전이면 무엇을 해야 하는지 말하며 실패한다', async () => {
    const { fn } = fakeFetch([]);
    const { deps } = makeDeps(null, fn);
    await expect(sendKakaoAlert(deps, message)).rejects.toBeInstanceOf(KakaoNotConnectedError);
  });

  it('리프레시 토큰까지 만료됐으면 카카오를 부르지 않고 재연결을 요구한다', async () => {
    const dead = {
      ...fresh,
      accessTokenExpiresAt: new Date('2026-10-01T00:00:00Z'),
      refreshTokenExpiresAt: new Date('2026-10-02T00:00:00Z'),
    };
    const { fn, calls } = fakeFetch([]);
    const { deps } = makeDeps(dead, fn);

    await expect(sendKakaoAlert(deps, message)).rejects.toThrow('다시 연결');
    expect(calls).toHaveLength(0);
  });

  it('200자를 넘는 본문은 잘라서 보낸다', async () => {
    const { fn, calls } = fakeFetch([ok()]);
    const { deps } = makeDeps(fresh, fn);

    await sendKakaoAlert(deps, { ...message, text: '가'.repeat(300) });

    const template = JSON.parse(new URLSearchParams(calls[0].body).get('template_object') ?? '{}');
    expect(template.text).toHaveLength(200);
    expect(template.link.web_url).toBe(message.linkUrl);
  });
});
