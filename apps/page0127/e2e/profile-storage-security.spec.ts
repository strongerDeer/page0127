import { expect, test } from '@playwright/test';

import { extractOwnedProfileImagePath } from '../src/shared/lib/profileStorage';

const SUPABASE_URL = 'https://project-ref.supabase.co';
const USER_ID = '11111111-1111-4111-8111-111111111111';

test('현재 사용자 소유의 프로필 이미지 경로만 허용한다', () => {
  const path = `avatars/${USER_ID}_1721700000000.jpg`;
  const url = `${SUPABASE_URL}/storage/v1/object/public/profiles/${path}`;

  expect(extractOwnedProfileImagePath(url, USER_ID, SUPABASE_URL)).toBe(path);
});

test('다른 사용자 경로와 다른 Supabase 프로젝트 URL을 거부한다', () => {
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const otherUserUrl = `${SUPABASE_URL}/storage/v1/object/public/profiles/avatars/${otherUserId}_1721700000000.jpg`;
  const otherProjectUrl = `https://evil-project.supabase.co/storage/v1/object/public/profiles/avatars/${USER_ID}_1721700000000.jpg`;

  expect(
    extractOwnedProfileImagePath(otherUserUrl, USER_ID, SUPABASE_URL)
  ).toBeNull();
  expect(
    extractOwnedProfileImagePath(otherProjectUrl, USER_ID, SUPABASE_URL)
  ).toBeNull();
});

test('조작된 경로와 지원하지 않는 확장자를 거부한다', () => {
  const traversalUrl = `${SUPABASE_URL}/storage/v1/object/public/profiles/avatars/${USER_ID}_../victim.jpg`;
  const unsupportedUrl = `${SUPABASE_URL}/storage/v1/object/public/profiles/avatars/${USER_ID}_1721700000000.svg`;

  expect(
    extractOwnedProfileImagePath(traversalUrl, USER_ID, SUPABASE_URL)
  ).toBeNull();
  expect(
    extractOwnedProfileImagePath(unsupportedUrl, USER_ID, SUPABASE_URL)
  ).toBeNull();
});
