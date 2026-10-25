import { expect, type Page, test } from '@playwright/test';

/**
 * 홈 책장 맛보기(비로그인 히어로) — 설계: docs/superpowers/specs/2026-10-08-home-shelf-preview-design.md
 * 24권은 운영 global_books 기준이라 개발·CI DB 에는 일부만 있을 수 있다 → 그리드가 모자라면 그 갈래를 건너뛴다.
 */

const PENDING_KEY = 'page0127:pending-shelf';

const section = (page: Page) =>
  page.getByRole('region', { name: /당신의 첫인상/ });

const pickButtons = (page: Page) =>
  section(page).getByRole('list').first().getByRole('button');

const readPending = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), PENDING_KEY);

test('저장소가 없는 다른 브라우저에서도 로그인 링크로 목표를 이어받는다', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  const s = section(page);
  await s
    .getByRole('button', {
      name: '아직 읽은 책이 없나요? 올해 목표부터 같이 세워봐요!',
    })
    .click();
  await s.getByRole('button', { name: '목표 저장하기' }).click();
  await expect(page).toHaveURL(/\/login\?shelf=/);
  const fresh = await browser.newContext();
  try {
    const external = await fresh.newPage();
    await external.goto(page.url());
    await expect(external.getByText(/목표 12권이 저장돼요/)).toBeVisible();
    await expect
      .poll(
        async () =>
          JSON.parse((await readPending(external)) ?? '{}').goal?.target
      )
      .toBe(12);
  } finally {
    await fresh.close();
  }
});

test('다른 브라우저에서 선택한 책 복원 후에도 원래 책 정보로 돌아갈 목적지를 유지한다', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  const link = page.locator('a[href^="/books/info/"]').first();
  await expect(link).toBeVisible();
  const path = await link.getAttribute('href');
  await page.goto(path!);
  await page
    .getByRole('button', { name: '내 책장에 담기', exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?shelf=/);
  expect(new URL(page.url()).searchParams.get('redirect')).toBe(path);
  const fresh = await browser.newContext();
  try {
    const external = await fresh.newPage();
    await external.goto(page.url());
    await expect(
      external.getByText(/고른 1권이 내 서재에 바로 꽂혀요/)
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          JSON.parse((await readPending(external)) ?? '{}').books?.[0]?.status
      )
      .toBe('want_to_read');
    expect(new URL(external.url()).searchParams.get('redirect')).toBe(path);
  } finally {
    await fresh.close();
  }
});

test('비로그인 홈의 h1 은 첫 화면 제목 하나다', async ({ page }) => {
  await page.goto('/');
  await expect(section(page)).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '읽은 책을 꽂아 두면'
  );
});

test('비로그인 홈은 왜 page0127.인가요 → 맛보기 → 보이는 것들 순서다', async ({
  page,
}) => {
  await page.goto('/');
  const top = async (name: RegExp) =>
    (await page.getByRole('region', { name }).first().boundingBox())?.y ?? 0;
  const why = await top(/왜 page0127/);
  const preview = await top(/당신의 첫인상/);
  const highlights = await top(/보이는 것들/);
  // 설명(왜) → 체험(맛보기) → 그다음 보상(쌓이면 보이는 것들) 순으로 읽힌다(2026-10-25 홈 개편)
  expect(why).toBeGreaterThan(0);
  expect(why).toBeLessThan(preview);
  expect(preview).toBeLessThan(highlights);
});

test('0권이면 목표 링크를 펼쳐 저장하고, 로그인으로 가며 목표를 보관한다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  await s
    .getByRole('button', {
      name: '아직 읽은 책이 없나요? 올해 목표부터 같이 세워봐요!',
    })
    .click();
  await s.getByRole('button', { name: '목표 한 권 늘리기' }).click();
  await expect(s.getByText('13권')).toBeVisible();

  await s.getByRole('button', { name: '목표 저장하기' }).click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await readPending(page);
  expect(JSON.parse(stored ?? '{}').goal.target).toBe(13);
  // 로그인 화면이 무엇을 하러 왔는지 이어서 말한다
  await expect(page.getByText(/목표 13권이 저장돼요/)).toBeVisible();
});

test('고르기 전엔 저장 버튼이 없고, 고르면 나타나 남은 권수를 말하며, 저장하면 보관한다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  await expect(s).toBeVisible();
  const picks = pickButtons(page);
  test.skip(
    (await picks.count()) < 2,
    '이 DB 에는 맛보기 책이 없다(운영 데이터)'
  );

  const save = s.getByRole('button', { name: '지금 책 저장하기' });
  await expect(save).toHaveCount(0);

  await picks.nth(0).click();
  await picks.nth(1).click();
  await expect(picks.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(
    s.getByText('1권만 더 고르면 첫인상을 알려드릴게요.')
  ).toBeVisible();

  // 같은 책을 다시 누르면 빠진다
  await picks.nth(1).click();
  await expect(
    s.getByText('2권만 더 고르면 첫인상을 알려드릴게요.')
  ).toBeVisible();

  await save.click();
  await expect(page).toHaveURL(/\/login/);
  const stored = await readPending(page);
  expect(JSON.parse(stored ?? '{}').books).toHaveLength(1);
  await expect(
    page.getByText('로그인하면 고른 1권이 내 서재에 바로 꽂혀요.')
  ).toBeVisible();
});

test('다른 책 보기로 묶음을 넘겨도 고른 책은 책장에 남는다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  const next = s.getByRole('button', { name: /다른 책 보기/ });
  test.skip(
    (await next.count()) === 0,
    '이 DB 에는 맛보기 책이 한 묶음 이하다(운영 데이터)'
  );

  await pickButtons(page).nth(0).click();
  await expect(s.getByText('내 책장 · 1권')).toBeVisible();
  await expect(next).toContainText('1/');

  await next.click();
  await expect(next).toContainText('2/');
  await expect(s.getByText('내 책장 · 1권')).toBeVisible();
});

test('책장에 꽂힌 책을 누르면 빠진다', async ({ page }) => {
  await page.goto('/');
  const s = section(page);
  const picks = pickButtons(page);
  test.skip(
    (await picks.count()) < 2,
    '이 DB 에는 맛보기 책이 없다(운영 데이터)'
  );

  await picks.nth(0).click();
  await picks.nth(1).click();
  await expect(s.getByText('내 책장 · 2권')).toBeVisible();

  const firstTitle = await picks.nth(0).getAttribute('aria-label');
  await s.getByRole('button', { name: `${firstTitle} 빼기` }).click();
  await expect(s.getByText('내 책장 · 1권')).toBeVisible();
  await expect(picks.nth(0)).toHaveAttribute('aria-pressed', 'false');
});

test('모두 비우기를 누르면 책장과 보관분이 비고 저장 버튼이 사라진다', async ({
  page,
}) => {
  await page.goto('/');
  const s = section(page);
  const picks = pickButtons(page);
  test.skip(
    (await picks.count()) < 2,
    '이 DB 에는 맛보기 책이 없다(운영 데이터)'
  );

  const reset = s.getByRole('button', { name: '모두 비우기' });
  await expect(reset).toHaveCount(0);

  await picks.nth(0).click();
  await picks.nth(1).click();
  await reset.click();

  await expect(s.getByText('내 책장 · 0권')).toBeVisible();
  await expect(s.getByRole('button', { name: '지금 책 저장하기' })).toHaveCount(
    0
  );
  expect(await readPending(page)).toBeNull();
});

test('고르고 떠났다가 다시 오면 책장이 되살아난다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        goal: null,
        books: [
          {
            isbn: '9788937462672',
            provider_item_id: '4827619',
            title: '페스트',
            author: '알베르 카뮈',
            publisher: '민음사',
            cover_image: 'https://image.yes24.com/goods/4827619/L',
            spine_image: null,
            pub_date: '2011-03-25',
            category: '소설',
            source: 'yes24',
          },
        ],
      })
    );
  }, PENDING_KEY);
  await page.reload();

  const s = section(page);
  await expect(s.getByText('내 책장 · 1권')).toBeVisible();
  await expect(
    s.getByRole('button', { name: '지금 책 저장하기' })
  ).toBeVisible();
});

test('다른 책 찾아보기를 누르면 검색창이 나온다', async ({ page }) => {
  await page.goto('/');
  const s = section(page);
  await s.getByRole('button', { name: '다른 책 찾아보기' }).click();
  await expect(
    s.getByRole('textbox', { name: '책 제목이나 저자' })
  ).toBeVisible();
});
