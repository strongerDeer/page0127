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

  await page.getByRole('button', { name: '보관하기', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '보관 해제', exact: true })
  ).toBeVisible();
  await context.clearCookies();
  await page.goto(path);
  await expect(page.getByText('404 - 페이지를 찾을 수 없습니다')).toBeVisible();
  const hidden = await page.request.get(`/api/books/${record.id}`);
  expect(hidden.status()).toBe(404);
});
