import { expect, test } from '@playwright/test';

import { findBookPath } from './helpers';

/**
 * 남의 책 상세 — 공유 링크·공개 서재에서 들어오는 화면.
 */

test('모바일(390px)에서 책 상세 제목이 짓눌리지 않고, 가로로 넘치지 않는다', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const path = await findBookPath(page);
  test.skip(!path, '이 DB 에는 공개 책 기록이 없다');
  await page.goto(path!);
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toBeVisible();

  // 표지(폭 224px 고정) 옆에 제목을 두면 제목 칸이 70~150px 로 짓눌린다.
  // 배지가 많은 책은 그마저 못 줄어 문서가 넘쳤다(2026-10-11 운영 449px).
  // 넘침은 책마다 다르지만 짓눌림은 늘 생기므로 제목 폭으로 확인한다.
  const width = (await title.boundingBox())?.width ?? 0;
  expect(width).toBeGreaterThanOrEqual(250);

  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
});

test('비로그인 방문자가 "나도 읽었어요"를 누르면 그 책을 보관하고 로그인으로 간다', async ({
  page,
}) => {
  const path = await findBookPath(page);
  test.skip(!path, '이 DB 에는 공개 책 기록이 없다');
  await page.goto(path!);
  await page.evaluate(() => localStorage.removeItem('page0127:pending-shelf'));

  await page.getByRole('button', { name: '나도 읽었어요' }).click();
  await expect(page).toHaveURL(/\/login/);

  const stored = await page.evaluate(() =>
    localStorage.getItem('page0127:pending-shelf')
  );
  expect(JSON.parse(stored ?? '{}').books).toHaveLength(1);
  await expect(
    page.getByText('로그인하면 고른 1권이 내 서재에 바로 꽂혀요.')
  ).toBeVisible();
});
