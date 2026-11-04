import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  client: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/shared/lib/admin/assertAdmin', () => ({ assertAdmin: mocks.admin }));
vi.mock('@/shared/config/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock('@/shared/config/supabase/server', () => ({
  createClient: mocks.client,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
import { deleteCatalogBook, resubmitBook, reviewBook } from './actions';

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

describe('직접 등록 책 강제 삭제', () => {
  const idForm = () => {
    const data = new FormData();
    data.set('id', '12345678-0000-0000-0000-000000000000');
    return data;
  };
  // from(table) 호출 순서대로 기록해 무엇을 어떤 순서로 지웠는지 본다
  const setup = (source: string) => {
    const deleted: string[] = [];
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'g1', isbn: 'manual:abc', source },
            error: null,
          }),
        }),
      }),
      delete: () => ({
        eq: async (column: string, value: string) => {
          deleted.push(`${table}:${column}=${value}`);
          return { error: null };
        },
      }),
    }));
    return deleted;
  };

  it('관리자가 아니면 아무것도 지우지 않는다', async () => {
    mocks.admin.mockRejectedValue(new Error('not found'));
    await expect(
      deleteCatalogBook({ ok: false, message: '' }, idForm())
    ).rejects.toThrow('not found');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('독서 기록을 먼저 지우고 공용 도서를 지운다 — 기록이 남으면 트리거가 되살린다', async () => {
    const deleted = setup('manual');
    expect(
      (await deleteCatalogBook({ ok: false, message: '' }, idForm())).ok
    ).toBe(true);
    expect(deleted).toEqual([
      'books:isbn=manual:abc',
      'global_books:id=12345678-0000-0000-0000-000000000000',
    ]);
  });

  it('서점 책은 지우지 않는다', async () => {
    const deleted = setup('yes24');
    const result = await deleteCatalogBook(
      { ok: false, message: '' },
      idForm()
    );
    expect(result.ok).toBe(false);
    expect(deleted).toEqual([]);
  });
});
