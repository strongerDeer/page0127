import { expect, test } from '@playwright/test';

test('헬스체크가 앱과 데이터베이스 정상 상태를 반환한다', async ({
  request,
}) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: 'ok',
    checks: { database: 'ok' },
  });
});

test('미인증 사용자는 비용 발생 AI API를 호출할 수 없다', async ({
  request,
}) => {
  const taste = await request.post('/api/taste-analysis/analyze');
  const compatibility = await request.post('/api/compatibility/analyze', {
    data: { targetUserId: '00000000-0000-0000-0000-000000000001' },
  });

  expect(taste.status()).toBe(401);
  expect(compatibility.status()).toBe(401);
});

test('미인증 사용자는 계정을 삭제할 수 없다', async ({ request }) => {
  const response = await request.delete('/api/auth/account');

  expect(response.status()).toBe(401);
});
