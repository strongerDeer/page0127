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

test('로그인 페이지에 소셜 로그인 버튼이 모두 보인다', async ({ page }) => {
  await page.goto('/login');

  // ⚠️ 문구는 src/features/auth/model/providers.tsx 가 정한다.
  //    거기서 label 을 바꾸면 이 테스트도 같이 고쳐야 한다 —
  //    실제로 '구글로 계속하기'로 바꿨을 때 이 테스트가 잡아냈다.
  await expect(
    page.getByRole('button', { name: /카카오 로그인/ })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /구글로 계속하기/ })
  ).toBeVisible();
});

test('문의 페이지에 카카오톡 문의 링크가 보인다', async ({ page }) => {
  await page.goto('/contact');

  // 카카오 오픈채팅으로 연결되는 외부 링크
  const kakaoLink = page.getByRole('link', { name: /카카오톡으로 문의하기/ });
  await expect(kakaoLink).toBeVisible();
  await expect(kakaoLink).toHaveAttribute('href', /open\.kakao\.com/);
});

test('모바일에서 긴 검색어의 빈 결과가 가로로 넘치지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const query = 'qa_no_such_book_20261024'.repeat(3);
  await page.goto(`/books/all?q=${encodeURIComponent(query)}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(query);
  await expect(page.getByText('0권을 찾았어요.')).toBeVisible();
  await expect(page.getByText(/다른 검색어로 다시 찾아보세요/)).toBeVisible();
  expect(
    await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }))
  ).toEqual({ scroll: 390, client: 390 });
});
