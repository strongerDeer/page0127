import { expect, test } from '@playwright/test';

import { findLibraryPath } from './helpers';

/**
 * 공개 서재 — 비로그인 방문자에게 가입 길을 연다.
 * 공유 링크로 들어온 사람이 실제 유입인데, 예전엔 "나도 만들기" 류의 길이 하나도 없었다.
 *
 * 서재 아이디는 DB 마다 달라(로컬·개발·운영) 사이트맵에서 하나를 고른다(helpers.ts).
 */

test('비로그인 케미 안내는 조건을 채운 서재에서만 보이고 로그인 목적지를 유지한다', async ({
  page,
}) => {
  const path = await findLibraryPath(page);
  test.skip(!path, '이 DB 에는 공개 서재가 없다');
  await page.goto(path!);

  // 서재 본문이 준비된 뒤, 케미가 열리는 서재에서만 안내를 확인한다.
  await page.getByRole('region', { name: '나도 내 책장 만들기' }).waitFor();
  // 케미는 상단 배너 한 장(2026-11-24) — 아래 카드·버튼 줄의 '독서 케미' 버튼은 배너로 모였다
  const chemiBanner = page.getByRole('region', { name: '독서 케미' });
  if (await chemiBanner.count()) {
    await expect(chemiBanner).toHaveCount(1);
    const chemi = chemiBanner.getByRole('link', { name: /케미 보기/ });
    await expect(chemi).toHaveAttribute('href', `${path}/compatibility`);
    await chemi.click();
    // 비로그인은 로그인 화면으로 바로 가지 않고 케미 안내 화면이 먼저 선다(2026-11-27) —
    // 링크 미리보기 봇도 비로그인이라, 바로 보내면 미리보기가 로그인 화면(홈 문구)이 됐다
    await expect(page).toHaveURL(new RegExp(`${path}/compatibility$`));
    await expect(
      page.getByRole('heading', { name: /나의 독서 케미/ })
    ).toBeVisible();
    const login = page.getByRole('link', { name: '로그인하고 케미 보기' });
    await expect(login).toHaveAttribute(
      'href',
      `/login?redirect=${encodeURIComponent(`${path}/compatibility`)}`
    );
    await login.click();
    await expect(page).toHaveURL(
      new RegExp(
        `/login\\?redirect=${encodeURIComponent(`${path}/compatibility`)}`
      )
    );
    // 안내 화면 → 로그인 두 번 이동했으니 서재로 바로 돌아간다
    await page.goto(path!);
  }

  // 페이지 끝 배너
  const banner = page.getByRole('region', { name: '나도 내 책장 만들기' });
  await expect(banner).toBeVisible();
  await expect(
    banner.getByRole('link', { name: /내 책장 만들기/ })
  ).toHaveAttribute('href', '/');
});

test('방문자는 전체 서재부터 보고, 연도를 고르면 독서 캘린더가 나온다 — 비공개 책 펼치기는 없다', async ({
  page,
}) => {
  const path = await findLibraryPath(page);
  test.skip(!path, '이 DB 에는 공개 서재가 없다');
  await page.goto(path!);

  // 방문자 기본 탭 = 전체(HJ, 2026-11-24) — 주인은 올해
  const allTab = page.getByRole('button', { name: '전체', exact: true });
  await expect(allTab).toHaveAttribute('aria-pressed', 'true');

  // 연도로 들어가면 캘린더 — 연도 탭은 폰에선 셀렉트라 주소로 바로 연다
  await page.goto(`${path!}?year=${new Date().getFullYear()}`);
  await expect(
    page.getByRole('heading', { name: '독서 캘린더' })
  ).toBeVisible();
  // 월을 넘겨도 요약이 남는다 (예전엔 넘기면 API 응답 검사 버그로 항상 0권)
  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByText(/^\d+월 \d+권 완독/)).toBeVisible();

  await expect(page.getByText('나만 보는 비공개 책')).toHaveCount(0);
});
