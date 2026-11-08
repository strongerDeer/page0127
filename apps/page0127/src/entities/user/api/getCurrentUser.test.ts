import {
  focusManager,
  QueryClient,
  QueryObserver,
} from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ apiClient: { get: mocks.get } }));

import { currentUserQueryOptions } from './getCurrentUser';

const client = new QueryClient();
afterEach(() => {
  client.clear();
  vi.resetAllMocks();
});

describe('로그인 사용자 캐시', () => {
  it('재조회가 실패해도 마지막으로 확인된 사용자를 null로 덮지 않는다', async () => {
    const user = { id: 'reader', email: 'reader@example.com' };
    mocks.get.mockResolvedValueOnce({ data: user });
    const options = {
      ...currentUserQueryOptions(),
      staleTime: 0,
      retry: false,
    };
    expect(await client.fetchQuery(options)).toEqual(user);
    const error = new Error('503');
    mocks.get.mockRejectedValueOnce(error);
    await expect(client.fetchQuery(options)).rejects.toBe(error);
    expect(client.getQueryData(options.queryKey)).toEqual(user);
    expect(client.getQueryState(options.queryKey)?.status).toBe('error');
  });

  it('성공한 비로그인 응답은 null로 반영한다', async () => {
    const user = { id: 'reader', email: 'reader@example.com' };
    const options = {
      ...currentUserQueryOptions(),
      staleTime: 0,
      retry: false,
    };
    client.setQueryData(options.queryKey, user);
    mocks.get.mockResolvedValueOnce({ data: null });
    expect(await client.fetchQuery(options)).toBeNull();
    expect(client.getQueryData(options.queryKey)).toBeNull();
  });

  it('일시 실패는 한 번 재시도하고 성공한 상태를 저장한다', async () => {
    const user = { id: 'reader', email: 'reader@example.com' };
    mocks.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { data: user } });
    expect(
      await client.fetchQuery({ ...currentUserQueryOptions(), retryDelay: 0 })
    ).toEqual(user);
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it('PWA가 다시 활성화되면 5분이 지나지 않아도 로그인 상태를 확인한다', async () => {
    const user = { id: 'reader', email: 'reader@example.com' };
    mocks.get.mockResolvedValue({ data: user });
    const options = currentUserQueryOptions();
    client.setQueryData(options.queryKey, user);
    client.mount();
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => {});
    try {
      expect(mocks.get).not.toHaveBeenCalled();
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    } finally {
      unsubscribe();
      client.unmount();
      focusManager.setFocused(undefined);
    }
  });
});
