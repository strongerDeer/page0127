import { expect, test } from '@playwright/test';

/**
 * 홈(소개를 합친 첫 화면)과 공지·업데이트 페이지 — 2026-10-25 홈 개편.
 * 소개는 홈이 맡고, 예전 /about 은 공지·업데이트(/updates)로 옮겼다.
 */

test('홈 첫 화면 제목이 JS 를 기다리지 않고 보이고, h1 은 하나다', async ({
  page,
}) => {
  await page.goto('/');
  // 돌아가는 단어(aria-hidden)는 빼고, 스크린리더가 듣는 이름으로 확인한다
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /책장이\s*취향을\s*말해 줍니다/,
    })
  ).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
});

test('홈 첫 화면 버튼은 같은 페이지의 맛보기·둘러보기로 내려간다', async ({
  page,
}) => {
  // 버튼이 다른 페이지로 나가지 않는다
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: '내 책장 만들어 보기' })
  ).toHaveAttribute('href', '#first-impression');
  await expect(
    page.getByRole('link', { name: '어떻게 쓰나요?' })
  ).toHaveAttribute('href', '#highlights');
});

test('홈 표지 띠에 깨진 이미지가 보이지 않는다', async ({ page }) => {
  // 원본 주소가 죽은 표지는 칸째로 빠져야 한다(SafeCover)
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const broken = await page.evaluate(
    () =>
      [...document.querySelectorAll('img')].filter(
        (img) => img.complete && img.naturalWidth === 0 && img.checkVisibility()
      ).length
  );
  expect(broken).toBe(0);
});

test('상단 메뉴에는 소개가 없다(데스크톱)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(nav.getByRole('link')).toHaveText(['홈', '전체 도서']);
});

test('푸터에서 공지·업데이트로 갈 수 있다', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: '푸터 링크' })
    .getByRole('link', { name: '공지·업데이트' })
    .click();
  await expect(page).toHaveURL(/\/updates$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '계속 자라는 중.'
  );
});

test('예전 소개 주소(/about)는 공지·업데이트로 옮겨 간다', async ({ page }) => {
  await page.goto('/about');
  await expect(page).toHaveURL(/\/updates$/);
});
