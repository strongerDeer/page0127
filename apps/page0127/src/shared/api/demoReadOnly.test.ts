import { AxiosError, AxiosHeaders } from 'axios';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEMO_READ_ONLY_CODE,
  DEMO_READ_ONLY_MESSAGE,
} from '@/shared/lib/demo/demoAccount';

import {
  DEMO_READ_ONLY_TOAST_ID,
  isDemoReadOnlyError,
  toastApiError,
} from './demoReadOnly';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

/** proxy 가 돌려주는 모양 그대로의 axios 에러 */
const axiosErrorWith = (status: number, data: unknown) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
};

const demoError = () =>
  axiosErrorWith(403, {
    error: DEMO_READ_ONLY_MESSAGE,
    code: DEMO_READ_ONLY_CODE,
  });

describe('isDemoReadOnlyError', () => {
  it('proxy 의 체험 계정 403 을 알아본다', () => {
    expect(isDemoReadOnlyError(demoError())).toBe(true);
  });

  it('code 가 없는 다른 403(권한 없음)은 체험 거절이 아니다', () => {
    expect(
      isDemoReadOnlyError(axiosErrorWith(403, { error: '권한 없음' }))
    ).toBe(false);
  });

  it('DB 트리거가 올린 PostgrestError 도 알아본다', () => {
    expect(
      isDemoReadOnlyError({ message: 'demo_read_only', code: '42501' })
    ).toBe(true);
  });

  it('일반 에러·알 수 없는 값은 아니다', () => {
    expect(isDemoReadOnlyError(new Error('boom'))).toBe(false);
    expect(isDemoReadOnlyError(null)).toBe(false);
    expect(isDemoReadOnlyError('demo_read_only')).toBe(false);
  });
});

describe('toastApiError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('체험 거절이면 실패 토스트를 띄우지 않는다(인터셉터가 이미 안내)', () => {
    toastApiError(demoError(), '실패했어요');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('그 밖에는 서버 문구를 실패 토스트로 띄운다', () => {
    toastApiError(
      axiosErrorWith(400, { error: '이미 팔로우 중이에요' }),
      '실패했어요'
    );
    expect(toast.error).toHaveBeenCalledWith('이미 팔로우 중이에요');
  });
});

describe('apiClient 인터셉터', () => {
  beforeEach(() => vi.clearAllMocks());

  it('체험 거절 응답이면 체험 안내를 한 장(고정 id)으로 띄우고 에러는 그대로 넘긴다', async () => {
    const { apiClient } = await import('./client');
    const rejected = (
      apiClient.interceptors.response as unknown as {
        handlers: { rejected: (e: unknown) => Promise<never> }[];
      }
    ).handlers[0].rejected;

    const error = demoError();
    await expect(rejected(error)).rejects.toBe(error);
    expect(toast).toHaveBeenCalledWith(DEMO_READ_ONLY_MESSAGE, {
      id: DEMO_READ_ONLY_TOAST_ID,
    });
  });
});
