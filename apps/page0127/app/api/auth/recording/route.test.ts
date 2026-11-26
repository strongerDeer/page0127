import { NextRequest } from 'next/server';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock('../../_helpers/auth', () => ({
  getSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/shared/config/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
    }),
  }),
}));

import { GET } from './route';

const request = () =>
  new NextRequest('https://page0127.com/api/auth/recording');
const signIn = (user: Record<string, unknown> | null) =>
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });

beforeEach(() => {
  vi.stubEnv('ADMIN_EMAILS', 'owner@example.com');
});
afterEach(() => {
  vi.unstubAllEnvs();
  mocks.getUser.mockReset();
  mocks.maybeSingle.mockReset();
});

describe('녹화 제외 판정 API', () => {
  it('비로그인은 제외하지 않는다', async () => {
    signIn(null);
    const response = await GET(request());
    expect(await response.json()).toEqual({ excluded: false, demo: false });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('관리자 이메일은 DB 를 읽지 않고 제외한다', async () => {
    signIn({ id: 'u1', email: 'Owner@example.com' });
    const response = await GET(request());
    expect(await response.json()).toEqual({ excluded: true, demo: false });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it('테스트 계정(is_test)은 제외한다', async () => {
    signIn({ id: 'u2', email: 'second@example.com' });
    mocks.maybeSingle.mockResolvedValue({
      data: { is_test: true },
      error: null,
    });
    expect(await (await GET(request())).json()).toEqual({
      excluded: true,
      demo: false,
    });
  });

  it('일반 회원은 제외하지 않는다', async () => {
    signIn({ id: 'u3', email: 'reader@example.com' });
    mocks.maybeSingle.mockResolvedValue({
      data: { is_test: false },
      error: null,
    });
    expect(await (await GET(request())).json()).toEqual({
      excluded: false,
      demo: false,
    });
  });

  it('체험 계정은 녹화하되 demo 로 표시한다', async () => {
    signIn({
      id: 'd',
      email: 'demo@example.com',
      app_metadata: { demo: true },
    });
    expect(await (await GET(request())).json()).toEqual({
      excluded: false,
      demo: true,
    });
  });

  it('조회가 실패하면 제외하지 않는다(200)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    signIn({ id: 'u4', email: 'reader@example.com' });
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'x' },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ excluded: false, demo: false });
  });
});
