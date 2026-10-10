import { expect, type Page, test } from '@playwright/test';

/**
 * 공개 서재 — 비로그인 방문자에게 가입 길을 연다.
 * 공유 링크로 들어온 사람이 실제 유입인데, 예전엔 "나도 만들기" 류의 길이 하나도 없었다.
 *
 * 서재 아이디는 DB 마다 달라(로컬·개발·운영) 사이트맵에서 하나를 고른다.
 */

/** 사이트맵의 고정 페이지 — 아이디가 아니다 */
const STATIC_PATHS = new Set([
  'about',
  'login',
  'terms',
  'privacy',
  'contact',
  'books',
  'search',
  'feed',
]);

const findLibraryPath = async (page: Page): Promise<string | null> => {
  const xml = await (await page.request.get('/sitemap.xml')).text();
  const paths = [
    ...xml.matchAll(/<loc>https?:\/\/[^/<]+\/([a-z0-9_]+)<\/loc>/g),
  ]
    .map((m) => m[1])
    .filter((p) => !STATIC_PATHS.has(p));
  return paths[0] ? `/${paths[0]}` : null;
};

test('비로그인 방문자에게 프로필 아래 케미 카드와 맨 끝 가입 배너를 보여 준다', async ({
  page,
}) => {
  const path = await findLibraryPath(page);
  test.skip(!path, '이 DB 에는 공개 서재가 없다');
  await page.goto(path!);

  // 기능 이름은 '독서 케미'
  await expect(
    page.getByRole('link', { name: '독서 케미', exact: true })
  ).toBeVisible();

  // 케미 문구는 한 번만 — 프로필 바로 아래
  const chemi = page.getByRole('link', { name: /독서 케미는\?/ });
  await expect(chemi).toHaveCount(1);
  await expect(chemi).toHaveAttribute('href', '/');

  // 페이지 끝 배너
  const banner = page.getByRole('region', { name: '나도 내 책장 만들기' });
  await expect(banner).toBeVisible();
  await expect(
    banner.getByRole('link', { name: /내 책장 만들기/ })
  ).toHaveAttribute('href', '/');
});
