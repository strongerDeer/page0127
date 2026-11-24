import { describe, expect, it } from 'vitest';

import {
  buildFirstTouch,
  parseFirstTouch,
  serializeFirstTouch,
  shouldRecordFirstTouch,
} from './firstTouch';

const now = new Date('2026-11-24T00:00:00Z');
const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const build = (
  url: string,
  referer: string | null = null,
  userAgent: string | null = SAFARI
) =>
  buildFirstTouch({
    url: new URL(url),
    referer,
    userAgent,
    siteHost: 'page0127.com',
    now,
  });

describe('buildFirstTouch', () => {
  it('utm 이 가장 먼저다', () => {
    const ft = build(
      'https://page0127.com/about?utm_source=Instagram&utm_medium=social&utm_campaign=reels_1',
      'https://www.google.com/'
    );
    expect(ft).toMatchObject({
      source: 'instagram',
      medium: 'social',
      campaign: 'reels_1',
      referrerHost: 'google.com',
      landingPath: '/about',
    });
  });

  it('외부 브라우저로 넘어온 via 표시를 이어 받는다', () => {
    expect(build('https://page0127.com/login?via=instagram').source).toBe(
      'instagram'
    );
    // 모르는 값은 무시
    expect(build('https://page0127.com/?via=evil').source).toBe('direct');
  });

  it('인스타 앱 안 브라우저는 Referer 없이도 인스타', () => {
    const ua = `${SAFARI} Instagram 300.0`;
    expect(build('https://page0127.com/', null, ua)).toMatchObject({
      source: 'instagram',
      medium: 'inapp',
    });
  });

  it('공유 링크', () => {
    expect(build('https://page0127.com/abc?from=share').source).toBe('share');
  });

  it('다른 사이트에서 오면 그 도메인, 우리 사이트 안 이동은 직접', () => {
    expect(
      build('https://page0127.com/', 'https://search.naver.com/search?q=책')
    ).toMatchObject({ source: 'search.naver.com', medium: 'referral' });
    expect(
      build('https://page0127.com/', 'https://www.page0127.com/x').source
    ).toBe('direct');
  });

  it('검색어 같은 쿼리는 담지 않는다', () => {
    const ft = build(
      'https://page0127.com/books?q=비밀',
      'https://google.com/?q=x'
    );
    expect(JSON.stringify(ft)).not.toContain('비밀');
    expect(ft.referrerHost).toBe('google.com');
  });
});

describe('shouldRecordFirstTouch', () => {
  const base = {
    method: 'GET',
    pathname: '/',
    hasCookie: false,
    isLoggedIn: false,
    userAgent: SAFARI,
    isPrefetchOrRsc: false,
  };
  it('처음 온 사람의 페이지 요청만', () => {
    expect(shouldRecordFirstTouch(base)).toBe(true);
    expect(shouldRecordFirstTouch({ ...base, hasCookie: true })).toBe(false);
    expect(shouldRecordFirstTouch({ ...base, isLoggedIn: true })).toBe(false);
    expect(shouldRecordFirstTouch({ ...base, isPrefetchOrRsc: true })).toBe(
      false
    );
    expect(shouldRecordFirstTouch({ ...base, pathname: '/api/x' })).toBe(false);
    expect(shouldRecordFirstTouch({ ...base, pathname: '/robots.txt' })).toBe(
      false
    );
  });
  it('봇은 건너뛴다', () => {
    expect(
      shouldRecordFirstTouch({ ...base, userAgent: 'Googlebot/2.1' })
    ).toBe(false);
    expect(shouldRecordFirstTouch({ ...base, userAgent: null })).toBe(false);
  });
});

describe('parseFirstTouch', () => {
  it('직렬화한 값을 그대로 되돌린다', () => {
    const ft = build('https://page0127.com/?utm_source=x');
    expect(parseFirstTouch(serializeFirstTouch(ft))).toEqual(ft);
  });
  it('손댄 값은 null', () => {
    expect(parseFirstTouch('%7Bbroken')).toBeNull();
    expect(parseFirstTouch(encodeURIComponent('{"source":"x"}'))).toBeNull();
    expect(parseFirstTouch(undefined)).toBeNull();
  });
});
