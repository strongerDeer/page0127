import { afterEach, expect, test } from 'vitest';

import { cronAuthResult } from './cron-auth';

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

const setNodeEnv = (value: string | undefined) => {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'NODE_ENV');
    return;
  }
  Reflect.set(process.env, 'NODE_ENV', value);
};

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  setNodeEnv(ORIGINAL_NODE_ENV);
});

test('운영에서 CRON_SECRET이 없으면 요청을 차단한다', () => {
  delete process.env.CRON_SECRET;
  setNodeEnv('production');

  const result = cronAuthResult(new Request('https://example.com/api/cron'));

  expect(result).toEqual({
    ok: false,
    status: 500,
    message: 'CRON_SECRET이 설정되지 않았습니다.',
  });
});

test('Authorization 헤더가 틀리면 요청을 차단한다', () => {
  process.env.CRON_SECRET = 'test-cron-secret';

  const result = cronAuthResult(
    new Request('https://example.com/api/cron', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
  );

  expect(result).toEqual({ ok: false, status: 401, message: 'Unauthorized' });
});

test('올바른 Authorization 헤더만 허용한다', () => {
  process.env.CRON_SECRET = 'test-cron-secret';

  const result = cronAuthResult(
    new Request('https://example.com/api/cron', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })
  );

  expect(result).toEqual({ ok: true });
});
