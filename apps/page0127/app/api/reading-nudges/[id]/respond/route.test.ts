import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  client: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('../../../_helpers/auth', () => ({
  getCurrentUser: mocks.auth,
  getSupabaseClient: mocks.client,
}));
import { POST } from './route';
const id = '00000000-0000-0000-0000-000000000001';
const params = { params: Promise.resolve({ id }) };
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/reading-nudges/' + id + '/respond', {
    method: 'POST',
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'recipient' }, error: null });
  mocks.client.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({
    data: { book_id: 'saved', status: 'completed' },
    error: null,
  });
});
it('인증 전에는 응답 RPC를 호출하지 않는다', async () => {
  mocks.auth.mockResolvedValue({
    error: NextResponse.json({}, { status: 401 }),
  });
  expect(
    (await POST(request({ action: 'save', isPublic: true }), params)).status
  ).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('완독 입력을 검증하고 인증 수신자는 RPC에서 확인한다', async () => {
  expect(
    (
      await POST(
        request({
          action: 'complete',
          isPublic: false,
          completedYear: 2024,
          rating: 4,
          user_id: 'fake',
        }),
        params
      )
    ).status
  ).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith('respond_reading_envelope', {
    p_notification_id: id,
    p_action: 'complete',
    p_is_public: false,
    p_completed_date: null,
    p_completed_year: 2024,
    p_rating: 4,
    p_start_date: null,
  });
});
it('잘못된 입력과 RPC 거부를 오류로 반환한다', async () => {
  expect(
    (
      await POST(
        request({ action: 'complete', isPublic: true, rating: 9 }),
        params
      )
    ).status
  ).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: '받은 봉투가 아니에요.' },
  });
  expect(
    (await POST(request({ action: 'accept', isPublic: true }), params)).status
  ).toBe(400);
});
