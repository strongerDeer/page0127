import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * 레이트 리밋 카운터를 테스트마다 격리한다.
 *
 * 왜 필요한가 (2026-07-29):
 * 레이트 리밋은 인증 검사보다 **앞단**이라, 한도를 넘으면 401 대신 429 가 돌아와
 * 아래 단언이 깨진다. 그런데 미인증 요청의 식별자는 x-forwarded-for 기반이고,
 * 그 헤더가 없으면 전부 `ip:unknown` **하나의 카운터를 공유**한다. CI 에는 이
 * 헤더가 없으니 PR 두 개의 E2E 가 겹치기만 해도 strict 등급(5회/분)을 넘겼다.
 *
 * 호출마다 고유한 값을 주면 카운터가 갈라져 이 테스트가 다른 실행에 휘둘리지 않는다.
 * (식별자는 문자열로만 쓰이므로 IP 형식일 필요는 없다)
 */
const isolatedClient = () => ({
  headers: { 'x-forwarded-for': `e2e-${randomUUID()}` },
});

test('헬스체크가 앱과 데이터베이스 정상 상태를 반환한다', async ({
  request,
}) => {
  const response = await request.get('/api/health', isolatedClient());

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    status: 'ok',
    checks: { database: 'ok' },
  });
});

test('미인증 사용자는 비용 발생 AI API를 호출할 수 없다', async ({
  request,
}) => {
  const taste = await request.post(
    '/api/taste-analysis/analyze',
    isolatedClient()
  );
  const compatibility = await request.post('/api/compatibility/analyze', {
    ...isolatedClient(),
    data: { targetUserId: '00000000-0000-0000-0000-000000000001' },
  });

  // 401 이어야 한다 — 429 로 무르면 인증 검사가 망가져도 통과한다.
  expect(taste.status()).toBe(401);
  expect(compatibility.status()).toBe(401);
});

test('미인증 사용자는 계정을 삭제할 수 없다', async ({ request }) => {
  const response = await request.delete('/api/auth/account', isolatedClient());

  expect(response.status()).toBe(401);
});
