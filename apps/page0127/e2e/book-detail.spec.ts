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

test('비로그인 방문자는 완독 입력을 저장한 뒤에만 책을 보관하고 로그인으로 간다', async ({
  page,
}) => {
  const path = await findBookPath(page);
  test.skip(!path, '이 DB 에는 공개 책 기록이 없다');
  await page.goto(path!);
  await page.evaluate(() => localStorage.removeItem('page0127:pending-shelf'));

  await page.getByRole('button', { name: '나도 읽었어요' }).click();
  const dialog = page.getByRole('dialog', { name: '내 완독 기록' });
  await expect(dialog).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
  expect(
    await page.evaluate(() => localStorage.getItem('page0127:pending-shelf'))
  ).toBeNull();

  // 열거나 취소한 것만으로는 완독 기록을 만들지 않는다.
  await dialog.getByRole('button', { name: '취소', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('page0127:pending-shelf'))
  ).toBeNull();

  await page.getByRole('button', { name: '나도 읽었어요' }).click();
  await dialog.getByRole('combobox', { name: '완독일 기록 방식' }).click();
  await page.getByRole('option', { name: '연도만', exact: true }).click();
  await dialog.getByLabel('완독 연도', { exact: true }).fill('2024');
  await dialog.getByRole('button', { name: '4점', exact: true }).click();
  await dialog.getByLabel('공개 기록으로 남기기').uncheck();
  await dialog
    .getByRole('button', { name: '완독 기록 저장', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login/);

  const stored = await page.evaluate(() =>
    localStorage.getItem('page0127:pending-shelf')
  );
  const books = JSON.parse(stored ?? '{}').books;
  expect(books).toHaveLength(1);
  expect(books[0]).toMatchObject({
    status: 'completed',
    completion: {
      completedDate: null,
      completedYear: 2024,
      rating: 4,
      isPublic: false,
    },
  });
  await expect(
    page.getByText('로그인하면 고른 1권이 내 서재에 바로 꽂혀요.')
  ).toBeVisible();
});
