import { expect, test } from '@playwright/test';

/**
 * 미들웨어 인증 게이트 smoke test
 *
 * middleware.ts의 두 갈래 로직을 직접 검증한다:
 *  - 보호 라우트: 미인증이면 /login으로 리다이렉트
 *  - 공개 예외(PUBLIC_EXCEPTIONS): 미인증이어도 그대로 통과
 *
 * 이 두 테스트는 이후 middleware → proxy 마이그레이션의 회귀 안전망 역할도 한다.
 */

test('미인증으로 보호 라우트 접근 시 /login으로 리다이렉트된다', async ({
  page,
}) => {
  await page.goto('/settings');

  // 미들웨어가 로그인 페이지로 돌려보낸다
  await expect(page).toHaveURL(/\/login/);
});

test('공개 예외 라우트(/books/all)는 미인증으로도 로드된다', async ({ page }) => {
  await page.goto('/books/all');

  // 리다이렉트되지 않고 해당 경로에 머무른다
  await expect(page).toHaveURL(/\/books\/all/);
});
