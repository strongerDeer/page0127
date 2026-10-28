import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  rpc: vi.fn(),
  client: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/shared/lib/admin/assertAdmin', () => ({ assertAdmin: mocks.admin }));
vi.mock('@/shared/config/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock('@/shared/config/supabase/server', () => ({
  createClient: mocks.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
import { resubmitBook, reviewBook } from './actions';

const form = () => {
  const data = new FormData();
  data.set('id', '12345678-0000-0000-0000-000000000000');
  data.set('version', '1');
  data.set('decision', 'approved');
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ id: 'server-admin' });
  mocks.rpc.mockResolvedValue({ error: null });
});
describe('검수 서버 액션 권한', () => {
  it('관리자가 아니면 DB RPC를 호출하기 전에 중단한다', async () => {
    mocks.admin.mockRejectedValue(new Error('not found'));
    await expect(
      reviewBook({ ok: false, message: '' }, form())
    ).rejects.toThrow('not found');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('검수자는 세션으로 결정하며 클라이언트의 검수자 ID를 무시한다', async () => {
    const data = form();
    data.set('reviewer', 'forged-admin');
    expect((await reviewBook({ ok: false, message: '' }, data)).ok).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'review_catalog_book',
      expect.objectContaining({
        p_reviewer: 'server-admin',
        p_version: 1,
        p_decision: 'approved',
      })
    );
  });
  it('반려 사유 누락과 오래된 버전을 사용자에게 설명한다', async () => {
    const data = form();
    data.set('decision', 'rejected');
    expect((await reviewBook({ ok: false, message: '' }, data)).ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    data.set('note', '확인 불가');
    mocks.rpc.mockResolvedValue({ error: { code: '40001' } });
    expect(
      (await reviewBook({ ok: false, message: '' }, data)).message
    ).toContain('변경');
  });
  it('보완 요청 재제출에는 로그인한 사용자가 필요하다', async () => {
    mocks.client.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    expect(
      (await resubmitBook({ ok: false, message: '' }, form())).message
    ).toContain('로그인');
  });
});
