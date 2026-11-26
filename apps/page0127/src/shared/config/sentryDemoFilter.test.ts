import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { isDemoReadOnlyRejection } from './sentryDemoFilter';

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

describe('isDemoReadOnlyRejection', () => {
  it('체험 계정 거절(403 + DEMO_READ_ONLY)은 거른다', () => {
    expect(
      isDemoReadOnlyRejection(
        axiosErrorWith(403, { error: '체험 계정은…', code: 'DEMO_READ_ONLY' })
      )
    ).toBe(true);
  });

  it('다른 403·500 은 그대로 올린다', () => {
    expect(
      isDemoReadOnlyRejection(axiosErrorWith(403, { error: '권한 없음' }))
    ).toBe(false);
    expect(
      isDemoReadOnlyRejection(axiosErrorWith(500, { code: 'DEMO_READ_ONLY' }))
    ).toBe(false);
  });

  it('응답이 없는 에러·알 수 없는 값은 거르지 않는다', () => {
    expect(isDemoReadOnlyRejection(new Error('boom'))).toBe(false);
    expect(isDemoReadOnlyRejection(null)).toBe(false);
    expect(isDemoReadOnlyRejection('DEMO_READ_ONLY')).toBe(false);
  });
});
