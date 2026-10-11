import type { Page } from '@playwright/test';

/**
 * 서재·책 주소는 DB 마다 달라(로컬·개발·운영) 테스트에 박아 둘 수 없다 → 사이트에서 찾는다.
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

/** 사이트맵에서 공개 서재 하나 (`/{username}`) */
export const findLibraryPath = async (page: Page): Promise<string | null> => {
  const xml = await (await page.request.get('/sitemap.xml')).text();
  const paths = [
    ...xml.matchAll(/<loc>https?:\/\/[^/<]+\/([a-z0-9_]+)<\/loc>/g),
  ]
    .map((m) => m[1])
    .filter((p) => !STATIC_PATHS.has(p));
  return paths[0] ? `/${paths[0]}` : null;
};

/** 그 서재에 꽂힌 공개 책 하나 (`/{username}/{bookId}`) */
export const findBookPath = async (page: Page): Promise<string | null> => {
  const library = await findLibraryPath(page);
  if (!library) return null;
  await page.goto(library);
  const source = `^${library}/[0-9a-f-]{20,}$`;
  const pattern = new RegExp(source);
  // 책장은 페이지가 열린 뒤 늦게 그려진다 — 바로 세면 "책 없음"으로 잘못 건너뛴다
  await page
    .waitForFunction(
      (src) =>
        [...document.querySelectorAll('a[href]')].some((a) =>
          new RegExp(src).test(a.getAttribute('href') ?? '')
        ),
      source,
      { timeout: 10_000 }
    )
    .catch(() => undefined);
  const hrefs = await page
    .locator(`a[href^="${library}/"]`)
    .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
  return hrefs.find((h) => pattern.test(h)) ?? null;
};
