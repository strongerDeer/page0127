import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  detail: vi.fn(),
  insert: vi.fn(),
}));
vi.mock('@/shared/api/book-provider', () => ({
  getBookProvider: () => ({ getByIsbn: mocks.detail }),
}));
vi.mock('@/shared/config/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.lookup }) }),
      insert: mocks.insert,
    }),
  }),
}));
import { ensureProviderCatalog } from './providerCatalog';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.lookup.mockResolvedValue({ data: null, error: null });
  mocks.insert.mockResolvedValue({ error: null });
});
describe('서버의 공급자 도서 확인', () => {
  it('새 도서는 서버에서 얻은 공급자 메타데이터로만 승인한다', async () => {
    mocks.detail.mockResolvedValue({
      isbn: '9788936434120',
      title: '공급자가 확인한 제목',
      source: 'yes24',
      coverImage: 'https://image.yes24.com/goods/1/XL',
    });
    await ensureProviderCatalog('9788936434120');
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '공급자가 확인한 제목',
        source: 'yes24',
        review_status: 'approved',
      })
    );
  });
  it('공급자에 없는 도서는 임의 승인하지 않는다', async () => {
    mocks.detail.mockResolvedValue(null);
    await expect(ensureProviderCatalog('missing')).rejects.toThrow(/직접 등록/);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('이미 검증하거나 검수 중인 카탈로그는 덮어쓰지 않는다', async () => {
    mocks.lookup.mockResolvedValue({ data: { id: 'exists' }, error: null });
    await ensureProviderCatalog('existing');
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
