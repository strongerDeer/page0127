import { expect, type Page, test } from '@playwright/test';

/**
 * 홈 책장 맛보기 — 비로그인 흐름 (설계: docs/superpowers/specs/2026-10-08-home-shelf-preview-design.md)
 * 10권은 운영 global_books 기준이라 개발·CI DB 에는 없을 수 있다 → 그리드가 비면 그 갈래를 건너뛴다.
 */

const PENDING_KEY = 'page0127:pending-shelf';

const section = (page: Page) =>
  page.getByRole('region', { name: '읽은 책을 골라 보세요.' });

const readPending = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), PENDING_KEY);

test('0권이면 목표 흐름이 보이고, 저장하면 로그인으로 가며 목표를 보관한다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  await expect(s).toBeVisible();
  await expect(
    s.getByText('아직 없어도 괜찮아요. 오늘부터 시작해요.')
  ).toBeVisible();

  await s.getByRole('button', { name: '목표 한 권 늘리기' }).click();
  await expect(s.getByText('13권')).toBeVisible();

  await s.getByRole('button', { name: '목표 저장하기' }).click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await readPending(page);
  expect(JSON.parse(stored ?? '{}').goal.target).toBe(13);
});

test('책을 고르면 책장에 꽂히고 남은 권수를 말하며, 저장하면 보관한다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  await expect(s).toBeVisible();
  const picks = s.getByRole('list').first().getByRole('button');
  const count = await picks.count();
  test.skip(count < 2, '이 DB 에는 맛보기 10권이 없다(운영 데이터)');

  await picks.nth(0).click();
  await picks.nth(1).click();
  await expect(picks.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(
    s.getByText('3권만 더 모이면 취향 노트를 받아 볼 수 있어요.')
  ).toBeVisible();

  // 같은 책을 다시 누르면 빠진다
  await picks.nth(1).click();
  await expect(
    s.getByText('4권만 더 모이면 취향 노트를 받아 볼 수 있어요.')
  ).toBeVisible();

  await s.getByRole('button', { name: '책장 저장하기' }).click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await readPending(page);
  expect(JSON.parse(stored ?? '{}').books).toHaveLength(1);
});

test('다른 책 찾기를 펼치면 검색창이 나온다', async ({ page }) => {
  await page.goto('/');
  const s = section(page);
  await s.getByRole('button', { name: '목록에 없나요? 다른 책 찾기' }).click();
  await expect(
    s.getByRole('textbox', { name: '책 제목이나 저자' })
  ).toBeVisible();
});
