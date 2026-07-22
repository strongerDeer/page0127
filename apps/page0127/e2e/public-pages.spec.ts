import { expect, test } from '@playwright/test';

/**
 * 공개 페이지 렌더링 smoke test
 *
 * 인증 없이 접근 가능한 페이지가 정상적으로 뜨는지 확인한다.
 * "앱이 부팅되고 주요 페이지가 렌더된다"를 보장하는 최소 안전망.
 */

test('랜딩 페이지가 로드된다', async ({ page }) => {
  await page.goto('/');

  // 랭킹 등 일부 섹션은 데이터/외부 API에 의존하지만,
  // 취향 리포트 섹션의 라벨은 항상 렌더되므로 안정적인 앵커로 쓴다.
  await expect(page.getByText('PAGE0127 TASTE REPORT')).toBeVisible();
});

test('로그인 페이지에 Google 로그인 버튼이 보인다', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('button', { name: /Google로 로그인/ })
  ).toBeVisible();
});

test('문의 페이지에 카카오톡 문의 링크가 보인다', async ({ page }) => {
  await page.goto('/contact');

  // 카카오 오픈채팅으로 연결되는 외부 링크
  const kakaoLink = page.getByRole('link', { name: /카카오톡으로 문의하기/ });
  await expect(kakaoLink).toBeVisible();
  await expect(kakaoLink).toHaveAttribute('href', /open\.kakao\.com/);
});
