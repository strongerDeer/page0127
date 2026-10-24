import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPublicBookRecord } from './getPublicBookRecord';

const from = vi.fn();

vi.mock('@/shared/config/supabase/anon', () => ({
  createAnonClient: () => ({ from }),
}));

describe('getPublicBookRecord', () => {
  beforeEach(() => {
    from.mockReset();
  });

  it('책 id 가 uuid 가 아니면 DB 에 묻지 않고 null', async () => {
    expect(await getPublicBookRecord('user-1', 'opengraph-image')).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('uuid 면 조회한다', async () => {
    const record = { title: '데미안' };
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: record, error: null }),
    };
    from.mockReturnValue(query);

    expect(
      await getPublicBookRecord(
        'user-1',
        '80a21270-ed22-4e3a-a1e9-17f65b361c54'
      )
    ).toBe(record);
    expect(from).toHaveBeenCalledWith('books');
  });
});
