import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  detail: vi.fn(),
  insert: vi.fn(),
  spine: vi.fn(),
}));
vi.mock('@/shared/api/book-provider/checkYes24SpineOnServer', () => ({
  checkYes24SpineOnServer: mocks.spine,
}));
// 책등 주소 만들기(buildYes24SpineUrl)는 진짜를 쓴다 — 공급자 호출만 가짜로
vi.mock('@/shared/api/book-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/book-provider')>()),
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
import { ensureProviderCatalog } from './ensureProviderCatalog';

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
  describe('withSpine — 책등도 서버에서 확인해 함께 저장', () => {
    const yes24Book = {
      isbn: '9788936434120',
      title: '논어',
      source: 'yes24',
      providerItemId: '123',
      coverImage: 'https://image.yes24.com/goods/123/XL',
    };
    const spineUrl = 'https://image.yes24.com/goods/123/SIDE/XL';

    it('진짜 책등이면 spine_image 를 함께 넣는다', async () => {
      mocks.detail.mockResolvedValue(yes24Book);
      mocks.spine.mockResolvedValue('real');
      await ensureProviderCatalog('9788936434120', { withSpine: true });
      expect(mocks.spine).toHaveBeenCalledWith(spineUrl);
      expect(mocks.insert).toHaveBeenCalledWith(
        expect.objectContaining({ spine_image: spineUrl })
      );
    });
    it('회색 대체 그림이거나 확인 실패면 비워 둔다', async () => {
      mocks.detail.mockResolvedValue(yes24Book);
      for (const check of ['none', 'error']) {
        mocks.insert.mockClear();
        mocks.spine.mockResolvedValue(check);
        await ensureProviderCatalog('9788936434120', { withSpine: true });
        expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty('spine_image');
      }
    });
    it('옵션이 없으면(사용자 등록 길) 책등을 확인하지 않는다', async () => {
      mocks.detail.mockResolvedValue(yes24Book);
      await ensureProviderCatalog('9788936434120');
      expect(mocks.spine).not.toHaveBeenCalled();
      expect(mocks.insert.mock.calls[0][0]).not.toHaveProperty('spine_image');
    });
  });
});
