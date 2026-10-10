import { expect, test } from '@playwright/test';

/**
 * 소개 페이지 — 첫 화면, 세 걸음 탭의 접근성, 표지, 진입로.
 * 자동 재생 규칙은 WCAG 2.2.2 (docs/superpowers/specs/2026-10-04-about-page-renewal-design.md §4).
 */

test('첫 화면 제목이 JS 를 기다리지 않고 보이고, h1 은 하나다', async ({
  page,
}) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
});

test('세 걸음 탭: 화살표로 이동하고 직접 고르면 자동 재생이 멈춘다', async ({
  page,
}) => {
  await page.goto('/about#steps');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);

  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute(
    'aria-labelledby',
    'step-tab-1'
  );
  await expect(
    page.getByRole('button', { name: '자동 재생 시작' })
  ).toBeVisible();

  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');

  // 직접 골랐으니 한 단계 시간(5.2초)이 지나도 그대로여야 한다
  await page.mouse.click(1, 1);
  await page.waitForTimeout(6000);
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
});

test('멈춘 뒤 재생 버튼을 마우스로 누르면 다시 진행한다', async ({ page }) => {
  // 클릭하면 포커스가 버튼으로 간다 — 포커스만으로 재생을 막으면
  // 아이콘은 '일시정지'인데 빈 화면에서 멈춘다(리뷰에서 발견)
  await page.goto('/about#steps');
  await page.getByRole('tab').first().click();
  await page.getByRole('button', { name: '자동 재생 시작' }).click();
  await expect(
    page.getByRole('button', { name: '자동 재생 일시정지' })
  ).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(page.getByRole('tab').nth(1)).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('움직임 줄이기: 자동 재생하지 않고 완성된 화면을 보여 준다', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/about#steps');
  await expect(
    page.getByRole('button', { name: '자동 재생 시작' })
  ).toBeVisible();
  await expect(page.getByRole('img', { name: '별점 4점' })).toBeVisible();
  await page.waitForTimeout(6000);
  await expect(page.getByRole('tab').first()).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await context.close();
});

test('표지 띠에 깨진 이미지가 보이지 않는다', async ({ page }) => {
  // 원본 주소가 죽은 표지는 칸째로 빠져야 한다(SafeCover)
  await page.goto('/about');
  await page.waitForLoadState('networkidle');
  const broken = await page.evaluate(
    () =>
      [...document.querySelectorAll('img')].filter(
        (img) => img.complete && img.naturalWidth === 0 && img.checkVisibility()
      ).length
  );
  expect(broken).toBe(0);
});

test('랜딩 하단에서 소개 페이지의 이용 방법으로 갈 수 있다', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: /어떻게 쓰는지 보기/ });
  await expect(link).toHaveAttribute('href', '/about#steps');
});

test('상단 메뉴에서 소개로 갈 수 있다(데스크톱)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  // 소개는 홈 바로 다음 — 처음 온 사람의 눈이 가장 먼저 닿는 자리
  await expect(nav.getByRole('link')).toHaveText(['홈', '소개', '전체 도서']);
  await nav.getByRole('link', { name: '소개' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(nav.getByRole('link', { name: '소개' })).toHaveAttribute(
    'aria-current',
    'page'
  );
});

test('소개 히어로는 홈과 다른 문장으로 시작하고, 첫 버튼은 홈의 체험으로 보낸다', async ({
  page,
}) => {
  await page.goto('/about');
  // 돌아가는 단어(aria-hidden)는 빼고, 스크린리더가 듣는 이름으로 확인한다
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /책장이\s*취향을\s*말해 줍니다/,
    })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '내 책장 만들어 보기' })
  ).toHaveAttribute('href', '/');
});
