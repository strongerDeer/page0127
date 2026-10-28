import { expect, test } from '@playwright/test';

test('표지 경계와 미리보기의 크기·키보드·화면 가장자리', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/books/all');
  const links = page.locator('main article a[aria-label$="상세 내용 보기"]');
  test.skip((await links.count()) === 0, '검증할 공개 도서가 없습니다.');
  const first = links.first();
  await expect(first).not.toHaveAttribute('title');
  const image = first.locator('img').last();
  if (await image.count()) {
    await expect(image).toHaveCSS('outline-style', 'solid');
    await expect(image).toHaveCSS('outline-width', '1px');
  }

  // 포커스만으로 열리고, Enter는 계속 원래 상세 링크로 이동해야 한다.
  await first.focus();
  const preview = page.getByRole('tooltip');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveCSS('width', '320px');
  await expect(preview.locator('p').nth(1)).toHaveCSS('font-size', '15px');
  await expect(preview.locator('p').nth(1)).toHaveCSS('line-height', '24px');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await expect(first).toBeFocused();
  await page.keyboard.press('Tab');

  // 줄 끝 카드에서도 패널 전체를 화면 안에 배치한다.
  const index = Math.min(5, (await links.count()) - 1);
  const edge = links.nth(index);
  await edge.hover();
  await expect(preview).toBeVisible();
  const bounds = await preview.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(15);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1265);
  // 패널 위로 포인터를 옮겨도 사라지지 않아야 읽을 수 있다.
  await preview.hover();
  await expect(preview).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await first.focus();
  await expect(preview).toBeVisible();
  await expect(first.locator('div').nth(1)).toHaveCSS('transform', 'none');
  const destination = await first.getAttribute('href');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
});

test('터치에서는 미리보기 없이 첫 탭에 상세로 이동한다', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await page.goto('/books/all');
    const first = page
      .locator('main article a[aria-label$="상세 내용 보기"]')
      .first();
    test.skip((await first.count()) === 0, '검증할 공개 도서가 없습니다.');
    const destination = await first.getAttribute('href');
    await first.tap();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
