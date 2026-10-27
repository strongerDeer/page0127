import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
  profile: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./auth', () => ({
  getCurrentUser: mocks.auth,
  getSupabaseClient: async () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
    }),
  }),
}));
import { handleBulkAction, parseBulkRequest } from './bulkAction';

const id = '10000000-0000-0000-0000-000000000001';
const payload = {
  requestId: crypto.randomUUID(),
  action: 'private',
  ids: [id],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id }, error: null });
  mocks.profile.mockResolvedValue({ data: { username: 'reader' } });
});

describe('bulk API boundary', () => {
  it('limits inputs to explicit operations and valid IDs with no cross-resource actions', () => {
    expect(parseBulkRequest(payload, 'books')?.ids).toEqual([id]);
    for (const value of [
      null,
      {},
      { ...payload, action: 'delete_read' },
      { ...payload, ids: [] },
      { ...payload, ids: [null] },
      { ...payload, ids: ['not-uuid'] },
      { ...payload, ids: Array(501).fill(id) },
      { ...payload, requestId: 'bad' },
    ])
      expect(parseBulkRequest(value, 'books')).toBeNull();
    expect(
      parseBulkRequest(
        { ...payload, action: 'delete_selected', ids: [id, id] },
        'notifications'
      )?.ids
    ).toEqual([id]);
    expect(
      parseBulkRequest(
        { ...payload, action: 'delete_read', ids: [], before: 'bad' },
        'notifications'
      )
    ).toBeNull();
    expect(
      parseBulkRequest(
        {
          ...payload,
          action: 'delete_read',
          ids: [],
          before: '2026-10-27T00:00:00Z',
        },
        'notifications'
      )
    ).not.toBeNull();
  });
  it('denies anonymous requests before calling the RPC', async () => {
    mocks.auth.mockResolvedValue({
      user: null,
      error: Response.json({ error: 'login' }, { status: 401 }),
    });
    expect(
      (
        await handleBulkAction(
          new Request('http://local', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
          'books'
        )
      ).status
    ).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('returns 400 for invalid JSON and validation failures without a database mutation', async () => {
    for (const body of ['{', '{}'])
      expect(
        (
          await handleBulkAction(
            new Request('http://local', { method: 'POST', body }),
            'books'
          )
        ).status
      ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('never passes user-supplied ownership to the RPC and revalidates public views after success', async () => {
    mocks.rpc.mockResolvedValue({ data: { count: 1, ids: [id] }, error: null });
    const response = await handleBulkAction(
      new Request('http://local', {
        method: 'POST',
        body: JSON.stringify({ ...payload, user_id: 'other' }),
      }),
      'books'
    );
    expect(await response.json()).toEqual({ count: 1, ids: [id] });
    expect(mocks.rpc).toHaveBeenCalledWith('perform_bulk_action', {
      p_request_id: payload.requestId,
      p_resource: 'books',
      p_action: 'private',
      p_ids: [id],
      p_before: null,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/reader', 'layout');
  });
  it('maps ownership conflicts to 403 and never reports success after a rollback', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect(
      (
        await handleBulkAction(
          new Request('http://local', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
          'books'
        )
      ).status
    ).toBe(403);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
