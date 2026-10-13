import { expect, test } from '@playwright/test';

import { findLibraryPath } from './helpers';

/**
 * 공개 서재 — 비로그인 방문자에게 가입 길을 연다.
 * 공유 링크로 들어온 사람이 실제 유입인데, 예전엔 "나도 만들기" 류의 길이 하나도 없었다.
 *
 * 서재 아이디는 DB 마다 달라(로컬·개발·운영) 사이트맵에서 하나를 고른다(helpers.ts).
 */

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

test('방문자도 올해 서재·독서 캘린더를 보고, 비공개 책 펼치기는 없다', async ({
  page,
}) => {
  const path = await findLibraryPath(page);
  test.skip(!path, '이 DB 에는 공개 서재가 없다');
  await page.goto(path!);

  // 기본 탭 = 올해(비었으면 최근 해) — '전체'가 선택돼 있으면 안 된다
  await expect(page.getByRole('tab', { name: '전체' })).toHaveAttribute(
    'aria-selected',
    'false'
  );

  await expect(
    page.getByRole('heading', { name: '독서 캘린더' })
  ).toBeVisible();
  // 월을 넘겨도 요약이 남는다 (예전엔 넘기면 API 응답 검사 버그로 항상 0권)
  await page.getByRole('button', { name: '이전 달' }).click();
  await expect(page.getByText(/^\d+월 \d+권 완독/)).toBeVisible();

  await expect(page.getByText('나만 보는 비공개 책')).toHaveCount(0);
});
