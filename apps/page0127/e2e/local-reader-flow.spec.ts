import { loadEnvConfig } from '@next/env';
import { expect, test as base } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

type Reader = { admin: SupabaseClient; id: string; username: string };

/** 로컬 DB에만 생성하고 테스트 후 정리하는 임시 독자. */
const test = base.extend<{ reader: Reader }>({
  reader: async ({ context, baseURL }, runTest) => {
    loadEnvConfig(process.cwd());
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey || !baseURL) {
      throw new Error('로컬 E2E에 필요한 Supabase 환경 변수가 없습니다.');
    }
    const isLoopback = (value: string) =>
      ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname);
    if (!isLoopback(url) || !isLoopback(baseURL)) {
      throw new Error('임시 계정 테스트는 로컬 앱과 로컬 DB에서만 실행합니다.');
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const username = `qa_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const email = `${username}@example.test`;
    const password = randomUUID();
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    const id = created.data.user.id;

    try {
      const profile = await admin.from('profiles').upsert({
        id,
        username,
        nickname: '오픈점검',
        onboarded_at: new Date().toISOString(),
      });
      if (profile.error) throw profile.error;

      let cookies: { name: string; value: string }[] = [];
      const auth = createServerClient(url, anonKey, {
        cookies: {
          getAll: () => cookies,
          setAll: (next) => {
            cookies = next;
          },
        },
      });
      const signedIn = await auth.auth.signInWithPassword({ email, password });
      if (signedIn.error) throw signedIn.error;
      await context.addCookies(
        cookies.map(({ name, value }) => ({
          name,
          value,
          url: baseURL,
          sameSite: 'Lax' as const,
        }))
      );
      await context.setExtraHTTPHeaders({ 'x-forwarded-for': username });
      await runTest({ admin, id, username });
    } finally {
      const removed = await admin.auth.admin.deleteUser(id);
      if (removed.error) throw removed.error;
    }
  },
});

// CSS 문자열 대신 실제 표면·선택·레이아웃을 확인한다. 임시 독자는 fixture가 정리한다.
test('디자인 점검: 주요 페이지의 흰색 면과 모바일 보기 전환', async ({
  page,
  reader,
}, testInfo) => {
  test.setTimeout(150_000);
  const year = new Date().getUTCFullYear();
  const bookId = randomUUID();
  const books = await reader.admin.from('books').insert([
    {
      id: bookId,
      user_id: reader.id,
      isbn: randomUUID(),
      title: '디자인 점검 완독 책',
      author: '점검 저자',
      status: 'completed',
      completed_date: `${year}-10-01`,
      rating: 4,
      is_public: true,
    },
    {
      id: randomUUID(),
      user_id: reader.id,
      isbn: randomUUID(),
      title: '디자인 점검 읽는 책',
      status: 'reading',
      start_date: `${year}-10-20`,
      is_public: true,
    },
  ]);
  if (books.error) throw books.error;
  const notifications = await reader.admin.from('notifications').insert(
    // 오래된 로컬 스키마에서도 실행 가능. 전체 6종은 Storybook에서 별도 검증한다.
    (['follow', 'comment', 'like'] as const).map((type, index) => ({
      user_id: reader.id,
      actor_id: reader.id,
      type,
      target_id: bookId,
      target_type: 'book',
      is_read: index % 2 === 1,
      message: null,
    }))
  );
  if (notifications.error) throw notifications.error;
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path, heading] of [
      ['library', `/${reader.username}`, '님의 서재'],
      ['notifications', '/notifications', '알림'],
      ['feed', '/feed', '라운지'],
      ['search', '/search', '리더 찾기'],
      ['settings', '/settings', '설정'],
      ['badges', `/${reader.username}/badges`, '배지 책장'],
    ]) {
      await page.goto(path);
      await expect(
        page.locator('main h1').filter({ hasText: heading })
      ).toBeVisible();
      await expect(page.locator('main > div').first()).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)'
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1
        ),
        `${name} ${width}px 가로 넘침`
      ).toBe(true);
      if (name === 'notifications') {
        await expect(
          page.locator('main').getByText('팔로우', { exact: true })
        ).toBeVisible();
        const filters = page.getByRole('group', { name: '알림 필터' });
        await filters
          .getByRole('button', { name: '읽지 않음', exact: true })
          .click();
        await expect(
          filters.getByRole('button', { name: '읽지 않음', exact: true })
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByText('댓글·답글', { exact: true })).toHaveCount(
          0
        );
        await filters
          .getByRole('button', { name: '전체', exact: true })
          .click();
      }
      if (name === 'library') {
        const periods = page.getByRole('group', { name: '통계 기간' });
        if (width === 1440) {
          await expect(
            page.getByLabel('연도 선택', { exact: true })
          ).toBeHidden();
        }
        await periods
          .getByRole('button', { name: '전체', exact: true })
          .click();
        await expect(
          periods.getByRole('button', { name: '전체', exact: true })
        ).toHaveAttribute('aria-pressed', 'true');
      }
      if (name === 'feed') {
        await expect(
          page.getByText('팔로우한 사람이 책을 읽으면 여기에 쌓입니다.', {
            exact: true,
          })
        ).toBeVisible();
      }
      await expect(page.locator('main .animate-pulse')).toHaveCount(0);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: 'instant' })
      );
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
});

test.skip(
  process.env.E2E_LOCAL_AUTH !== '1',
  '로컬 전용: E2E_LOCAL_AUTH=1과 로컬 Supabase가 필요합니다.'
);

for (const { path, api, message, empty } of [
  {
    path: '/notifications',
    api: '**/api/notifications?*',
    message: '알림을 불러오지 못했어요.',
    empty: '알림이 없습니다',
  },
  {
    path: '/feed',
    api: '**/api/feed?*',
    message: '독서 기록을 불러오지 못했어요.',
    empty: '팔로우한 사람이 책을 읽으면 여기에 쌓입니다.',
  },
]) {
  test(`${path}: 장애를 빈 목록과 구분하고 재시도로 복구한다`, async ({
    page,
    reader,
  }) => {
    expect(reader.id).toBeTruthy();
    let failing = true;
    await page.route(api, (route) =>
      route.fulfill({
        status: failing ? 500 : 200,
        contentType: 'application/json',
        body: JSON.stringify(failing ? { error: 'test failure' } : []),
      })
    );
    await page.goto(path);
    const alert = page.getByRole('alert').filter({ hasText: message });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(empty, { exact: true })).toHaveCount(0);

    failing = false;
    await alert.getByRole('button', { name: '다시 시도', exact: true }).click();
    await expect(alert).toHaveCount(0);
    await expect(page.getByText(empty, { exact: true })).toBeVisible();
  });
}

test('피드 추가 조회 실패 시 기존 기록을 유지하고 실패한 페이지만 재시도한다', async ({
  page,
  reader,
}) => {
  const activities = Array.from({ length: 20 }, (_, index) => ({
    id: randomUUID(),
    activity_type: 'book_added',
    content: null,
    created_at: new Date().toISOString(),
    user: {
      id: reader.id,
      username: reader.username,
      nickname: '오픈점검',
      photo_url: null,
    },
    book: {
      id: randomUUID(),
      title: `테스트 도서 ${index}`,
      author: '테스트 저자',
      cover_image: null,
      status: 'reading',
      rating: null,
      is_life_book: false,
    },
    likes: { count: 0, isLiked: false },
    commentCount: 0,
    newCommentCount: 0,
    bookEvents: [],
    reviewContent: null,
  }));
  let failing = true;
  let firstPageRequests = 0;
  await page.route('**/api/feed?*', (route) => {
    const offset = new URL(route.request().url()).searchParams.get('offset');
    if (offset === '0') firstPageRequests++;
    const failed = offset !== '0' && failing;
    return route.fulfill({
      status: failed ? 500 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        failed ? { error: 'test failure' } : offset === '0' ? activities : []
      ),
    });
  });
  await page.goto('/feed');
  await expect(page.locator('article')).toHaveCount(20);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const alert = page
    .getByRole('alert')
    .filter({ hasText: '독서 기록을 불러오지 못했어요.' });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('article')).toHaveCount(20);
  await expect(page.getByText('모든 활동을 불러왔습니다')).toHaveCount(0);

  failing = false;
  await alert.getByRole('button', { name: '다시 시도', exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(20);
  await expect(page.getByText('모든 활동을 불러왔습니다')).toBeVisible();
  expect(firstPageRequests).toBe(1);
});

test('온보딩을 완료하면 빈 서재에 도착하고 공유 주소를 복사할 수 있다', async ({
  page,
  context,
  reader,
  baseURL,
}) => {
  const reset = await reader.admin
    .from('profiles')
    .update({ onboarded_at: null })
    .eq('id', reader.id);
  if (reset.error) throw reset.error;

  await page.goto('/onboarding');
  await page.getByLabel('아이디', { exact: true }).fill('ab');
  await expect(
    page.getByRole('button', { name: '시작하기', exact: true })
  ).toBeDisabled();
  await page.getByLabel('아이디', { exact: true }).fill(reader.username);
  await page.getByLabel('닉네임', { exact: true }).fill('오픈점검');
  await expect(page.getByText('쓸 수 있는 아이디예요.')).toBeVisible();
  await expect(
    page.getByRole('button', { name: '시작하기', exact: true })
  ).toBeDisabled();
  await page.getByRole('checkbox', { name: /만 14세 이상/ }).check();
  await page.getByRole('button', { name: '시작하기', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${reader.username}(\\?|$)`));
  await expect(page.getByText('첫 책을 기록해 보세요')).toBeVisible();

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  // 데스크톱 주소 복사 경로를 고정한다. OS 공유 시트 전송은 별도 실기기 점검.
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    })
  );
  await page
    .getByRole('button', { name: '서재 공유하기', exact: true })
    .click();
  await page
    .getByRole('button', { name: '링크 공유하기', exact: true })
    .click();
  await expect(page.getByText('주소를 복사했어요.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseURL}/${reader.username}`
  );

  await context.clearCookies();
  await page.goto(`/${reader.username}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    '오픈점검'
  );
  await expect(
    page.getByRole('region', { name: '나도 내 책장 만들기' })
  ).toBeVisible();
});

for (const outcome of ['resolve', 'AbortError', 'NotAllowedError'] as const) {
  test(`이미지 공유 ${outcome}: 성공·취소·저장 전환을 구분한다`, async ({
    page,
    reader,
  }) => {
    await page.addInitScript((result) => {
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          const target = window as Window & {
            sharedFile?: { type: string; name: string };
          };
          const file = data.files?.[0];
          if (file) target.sharedFile = { type: file.type, name: file.name };
          if (result !== 'resolve')
            throw new DOMException('test share', result);
        },
      });
    }, outcome);
    await page.route(`**/${reader.username}/story-image`, (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7V8AAAAASUVORK5CYII=',
          'base64'
        ),
      })
    );
    await page.goto(`/${reader.username}`);
    await page
      .getByRole('button', { name: '서재 공유하기', exact: true })
      .click();
    const share = page.getByRole('button', {
      name: '이미지 공유하기',
      exact: true,
    });
    await expect(share).toBeEnabled();
    const download = page
      .waitForEvent('download', {
        timeout: outcome === 'NotAllowedError' ? 5000 : 1000,
      })
      .catch(() => null);
    await share.click();
    const file = await download;
    await expect(share).toBeEnabled();
    expect(
      await page.evaluate(
        () =>
          (window as Window & { sharedFile?: { type: string; name: string } })
            .sharedFile
      )
    ).toEqual({ type: 'image/png', name: expect.stringMatching(/\.png$/) });
    if (outcome === 'NotAllowedError') {
      expect(file).not.toBeNull();
      expect(file!.suggestedFilename()).toMatch(/\.png$/);
      await expect(
        page.getByText('이미지를 저장했어요. 저장한 이미지를 공유해 주세요.')
      ).toBeVisible();
    } else {
      expect(file).toBeNull();
      await expect(
        page.getByText(/이미지를 저장했어요|공유하지 못했어요/)
      ).toHaveCount(0);
    }
  });
}

test('이미지 생성이 실패해도 서재 링크는 복사할 수 있다', async ({
  page,
  context,
  reader,
  baseURL,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
  );
  await page.route(`**/${reader.username}/story-image`, (route) =>
    route.fulfill({ status: 500, body: 'test failure' })
  );
  await page.goto(`/${reader.username}`);
  await page
    .getByRole('button', { name: '서재 공유하기', exact: true })
    .click();
  await expect(
    page.getByText('이미지를 만들지 못했어요.', { exact: false })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '이미지 저장하기', exact: true })
  ).toBeDisabled();
  await page
    .getByRole('button', { name: '링크 공유하기', exact: true })
    .click();
  await expect(page.getByText('주소를 복사했어요.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseURL}/${reader.username}`
  );
});

test('검색·등록·수정한 기록은 새로고침 후 유지되고 보관하면 방문자에게 숨겨진다', async ({
  page,
  context,
  reader,
  browser,
  baseURL,
}) => {
  const sample = await reader.admin
    .from('global_books')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (sample.error) throw sample.error;
  test.skip(!sample.data, '로컬에 등록할 도서 표본이 없습니다.');
  const book = sample.data!;
  // 외부 공급자만 고정한다. 등록·수정·공개 여부는 실제 로컬 앱/DB를 통과한다.
  const providerBook = {
    isbn: book.isbn,
    title: book.title,
    subTitle: book.sub_title,
    author: book.author ?? '',
    publisher: book.publisher ?? '',
    pubDate: book.pub_date,
    description: book.description ?? '',
    category: book.category ?? '',
    coverImage: '',
    spineImage: null,
    backImage: null,
    page: book.page_count,
    toc: null,
    dimensions: null,
    source: book.source ?? 'manual',
    providerItemId: book.provider_item_id,
    providerLink: '',
  };
  await page.route('**/api/books/search?*', (route) =>
    route.fulfill({
      json: { items: [providerBook], totalResults: 1, page: 1 },
    })
  );
  await page.route('**/api/books/detail?*', (route) =>
    route.fulfill({ json: providerBook })
  );
  await page.goto('/books/add');
  await page.locator('main').getByRole('textbox').fill(book.title);
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await page.getByRole('button', { name: '4점', exact: true }).click();
  await page
    .getByLabel('이 책을 한 문장으로 남긴다면?')
    .fill('처음 남긴 독서 기록');
  await page
    .getByLabel('나만의 메모', { exact: true })
    .fill('주인만 읽는 테스트 메모');
  const savedResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/books') &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: '등록하기', exact: true }).click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const record = await saved.json();
  await expect(
    page.getByRole('button', { name: '내 책장 보기' })
  ).toBeVisible();

  const path = `/${reader.username}/${record.id}`;
  await page.goto(`${path}/edit`);
  await page.getByRole('button', { name: '5점', exact: true }).click();
  await page
    .getByLabel('이 책을 한 문장으로 남긴다면?')
    .fill('수정한 독서 기록');
  await page.getByRole('button', { name: '수정하기', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await page.reload();
  await expect(
    page.getByText('수정한 독서 기록', { exact: true }).first()
  ).toBeVisible();
  const persisted = await reader.admin
    .from('books')
    .select('rating, one_line_review')
    .eq('id', record.id)
    .single();
  expect(persisted.data).toEqual({
    rating: 5,
    one_line_review: '수정한 독서 기록',
  });
  await expect(
    page.getByText('주인만 읽는 테스트 메모', { exact: true })
  ).toBeVisible();
  const visitor = await browser.newContext({ baseURL });
  try {
    const publicRecord = await visitor.request.get(`/api/books/${record.id}`);
    expect(publicRecord.status()).toBe(200);
    expect((await publicRecord.json()).personal_memo).toBeNull();
  } finally {
    await visitor.close();
  }

  await page
    .getByRole('button', { name: '비공개로 변경', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '공개로 변경', exact: true })
  ).toBeVisible();
  await context.clearCookies();
  await page.goto(path);
  await expect(page.getByText('404 - 페이지를 찾을 수 없습니다')).toBeVisible();
  const hidden = await page.request.get(`/api/books/${record.id}`);
  expect(hidden.status()).toBe(404);
});

test('일괄 알림 관리: 선택 삭제와 페이지 밖 읽은 알림 삭제', async ({
  page,
  reader,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const rows = Array.from({ length: 44 }, (_, index) => ({
    id: randomUUID(),
    user_id: reader.id,
    actor_id: reader.id,
    type: 'follow',
    is_read: index >= 2,
    created_at: '2025-01-01T00:00:00Z',
  }));
  const inserted = await reader.admin.from('notifications').insert(rows);
  if (inserted.error) throw inserted.error;
  const visitor = await browser.newContext({ baseURL });
  try {
    expect(
      (
        await visitor.request.post('/api/notifications/bulk', {
          data: {
            requestId: randomUUID(),
            action: 'delete_selected',
            ids: [rows[0].id],
          },
        })
      ).status()
    ).toBe(401);
  } finally {
    await visitor.close();
  }
  await page.goto('/notifications');
  await page.getByRole('button', { name: '선택', exact: true }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: '선택 삭제', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('알림 1개');
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await reader.admin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', reader.id)
        ).count
    )
    .toBe(43);
  const unreadBefore = (
    await reader.admin
      .from('notifications')
      .select('id')
      .eq('user_id', reader.id)
      .eq('is_read', false)
  ).data!;
  await page.getByRole('button', { name: '알림 더보기' }).click();
  await page.getByRole('menuitem', { name: '읽은 알림 모두 삭제' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('불러오지 않은');
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const remaining = await reader.admin
    .from('notifications')
    .select('id,is_read')
    .eq('user_id', reader.id);
  expect(remaining.data?.map((row) => row.id).sort()).toEqual(
    unreadBefore.map((row) => row.id).sort()
  );
  expect(remaining.data?.every((row) => !row.is_read)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('notifications-bulk-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('일괄 서재 관리: 회독별 선택·비공개 복구·선택 삭제와 실패 재시도', async ({
  page,
  reader,
}) => {
  test.setTimeout(90_000);
  const isbn = randomUUID();
  const records = [
    {
      id: randomUUID(),
      user_id: reader.id,
      isbn,
      title: '같은 책 첫 번째 기록',
      status: 'completed',
      read_count: 1,
      is_public: true,
      completed_date: '2025-10-01',
    },
    {
      id: randomUUID(),
      user_id: reader.id,
      isbn,
      title: '같은 책 두 번째 기록',
      status: 'completed',
      read_count: 2,
      is_public: true,
      completed_date: '2026-10-01',
    },
    {
      id: randomUUID(),
      user_id: reader.id,
      isbn: randomUUID(),
      title: '읽고 싶은 비공개 책',
      status: 'want_to_read',
      read_count: 1,
      is_public: false,
      completed_date: null,
    },
  ];
  const inserted = await reader.admin.from('books').insert(records);
  if (inserted.error) throw inserted.error;
  await page.goto(`/${reader.username}`);
  await page.getByRole('link', { name: '서재 관리', exact: true }).click();
  await expect(page.getByRole('heading', { name: '서재 관리' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await page
    .getByRole('checkbox', { name: '같은 책 첫 번째 기록 1회독 선택' })
    .check();
  await page
    .getByRole('button', { name: '비공개로 변경', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '비공개로 변경', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const privacy = await reader.admin
    .from('books')
    .select('id,is_public')
    .in(
      'id',
      records.map((row) => row.id)
    );
  expect(privacy.data?.find((row) => row.id === records[0].id)?.is_public).toBe(
    false
  );
  expect(privacy.data?.find((row) => row.id === records[1].id)?.is_public).toBe(
    true
  );
  await page
    .getByRole('combobox', { name: '공개 범위', exact: true })
    .selectOption('private');
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  await page
    .getByRole('checkbox', { name: '같은 책 첫 번째 기록 1회독 선택' })
    .check();
  await page.getByRole('button', { name: '공개로 변경', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '공개로 변경', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(1);
  await page
    .getByRole('combobox', { name: '공개 범위', exact: true })
    .selectOption('all');
  await expect(page.getByRole('checkbox')).toHaveCount(3);
  await page
    .getByRole('checkbox', { name: '같은 책 두 번째 기록 2회독 선택' })
    .check();
  // Changing a filter deliberately clears selection.
  await page
    .getByRole('combobox', { name: '독서 상태', exact: true })
    .selectOption('completed');
  await expect(page.getByText('0개 기록 선택', { exact: true })).toBeVisible();
  await page
    .getByRole('checkbox', { name: '같은 책 두 번째 기록 2회독 선택' })
    .check();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, {
    timeout: 10000,
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: test.info().outputPath('library-management-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  let fail = true;
  await page.route('**/api/books/bulk', (route) =>
    fail
      ? route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: '테스트 실패: 다시 시도해주세요.' }),
        })
      : route.continue()
  );
  await page
    .getByRole('group', { name: '서재 일괄 관리' })
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toContainText('복구할 수 없어요');
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText(
    '테스트 실패'
  );
  fail = false;
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '삭제', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(
    (
      await reader.admin.from('books').select('id').eq('user_id', reader.id)
    ).data
      ?.map((row) => row.id)
      .sort()
  ).toEqual([records[0].id, records[2].id].sort());
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true);
});
