import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  client: vi.fn(),
  detail: vi.fn(),
  push: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
}));
vi.mock('../_helpers/auth', () => ({
  getCurrentUser: mocks.auth,
  getSupabaseClient: mocks.client,
}));
vi.mock('../_helpers/push', () => ({ schedulePush: mocks.push }));
vi.mock('@/shared/api/book-provider', () => ({
  getBookProvider: () => ({ getByIsbn: mocks.detail }),
}));
import { POST } from './route';
const recipientId = '00000000-0000-0000-0000-000000000002';
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/reading-nudges', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'sender' }, error: null });
  mocks.rpc.mockResolvedValue({ data: 'notification-id', error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.single.mockResolvedValue({ data: { id: 'catalog-id' }, error: null });
  mocks.client.mockResolvedValue({
    rpc: mocks.rpc,
    from: vi.fn((table) => {
      if (table !== 'global_books')
        throw new Error('발신자 서재를 수정하면 안 된다');
      return {
        insert: mocks.insert,
        select: () => ({ eq: () => ({ single: mocks.single }) }),
      };
    }),
  });
  mocks.detail.mockResolvedValue({
    isbn: '9788937460449',
    title: '데미안',
    author: '헤르만 헤세',
    page: 240,
  });
});
describe('책 메시지 전송', () => {
  it('비로그인 요청은 공급자나 DB를 호출하지 않는다', async () => {
    mocks.auth.mockResolvedValue({
      user: null,
      error: NextResponse.json({}, { status: 401 }),
    });
    expect((await POST(request({}))).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('추천에는 책이 필요하고 빈 메시지도 막는다', async () => {
    expect(
      (
        await POST(
          request({ recipientId, kind: 'recommendation', message: '안녕' })
        )
      ).status
    ).toBe(400);
    expect(
      (await POST(request({ recipientId, kind: 'note', message: '  ' }))).status
    ).toBe(400);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('선택한 책은 공용 목록에만 보관하고 인증한 발신자로 푸시를 예약한다', async () => {
    const response = await POST(
      request({
        recipientId,
        actor_id: 'fake',
        kind: 'invitation',
        message: ' 같이 읽자 ',
        bookIsbn: '9788937460449',
      })
    );
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'send_reading_envelope',
      expect.objectContaining({
        p_user_id: recipientId,
        p_message: '같이 읽자',
        p_kind: 'invitation',
        p_catalog_book_id: 'catalog-id',
      })
    );
    expect(mocks.push).toHaveBeenCalledWith([
      {
        id: 'notification-id',
        user_id: recipientId,
        actor_id: 'sender',
        type: 'reading_nudge',
      },
    ]);
  });
  it('책 없는 한마디는 공급자 조회 없이 전송한다', async () => {
    expect(
      (await POST(request({ recipientId, kind: 'note', message: '잘 지내?' })))
        .status
    ).toBe(201);
    expect(mocks.detail).not.toHaveBeenCalled();
  });
  it('전송 제한·수신 거부 시 푸시하지 않는다', async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: '오늘은 이미 보냈어요.' },
      data: null,
    });
    expect(
      (await POST(request({ recipientId, kind: 'note', message: '안녕' })))
        .status
    ).toBe(400);
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it('공급자에 없는 책과 조회 장애는 전송하지 않는다', async () => {
    mocks.detail
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('offline'));
    const body = {
      recipientId,
      kind: 'recommendation',
      message: '추천',
      bookIsbn: '9788937460449',
    };
    expect((await POST(request(body))).status).toBe(404);
    expect((await POST(request(body))).status).toBe(500);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
