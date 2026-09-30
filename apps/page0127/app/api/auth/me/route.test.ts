import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

// 세션 조회만 가짜로 바꾼다 — 라우트가 "로그인 여부"를 어떤 응답으로 번역하는지가 검증 대상이다.
const getUser = vi.fn();
vi.mock('../../_helpers/auth', () => ({
  getSupabaseClient: async () => ({ auth: { getUser } }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
});

const call = () => GET(new Request('http://localhost/api/auth/me') as never);

describe('GET /api/auth/me', () => {
  /**
   * 비로그인은 "실패"가 아니라 "로그인 안 함"이라는 정상 답이다.
   * 4xx로 답하면 브라우저가 콘솔에 `Failed to load resource`를 직접 찍고,
   * 이건 JS로 막을 수 없다 → 방문자마다 콘솔 에러 1건(품질 대시보드에 그대로 잡힘).
   */
  it('비로그인이면 200 + null을 준다 — 콘솔 에러를 만들지 않는다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('세션이 만료돼 에러가 와도 비로그인과 같게 200 + null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Auth session missing!'),
    });

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('로그인이면 id·email을 준다', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    });

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'u1', email: 'a@b.c' });
  });
});
