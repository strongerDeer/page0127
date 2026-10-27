import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_DEVICE_KEY,
  GoogleAnalytics,
  isNonProductionEnv,
  MEASUREMENT_UA_PATTERN,
} from './GoogleAnalytics';

import type { ReactElement } from 'react';

const GA_ID = 'G-TEST';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/**
 * ga-init 인라인 스크립트를 가짜 window 에서 실제로 실행해 ga-disable 스위치가 켜지는지 본다.
 * 학습 포인트: 문자열로 주입되는 스크립트는 타입 검사가 안 되므로, node:vm 으로 돌려 봐야 오타를 잡는다.
 */
const runGaInit = (opts: {
  userAgent: string;
  storage: unknown;
  webdriver?: boolean;
  href?: string;
}) => {
  vi.stubEnv('NEXT_PUBLIC_GA_ID', GA_ID);
  const fragment = GoogleAnalytics() as ReactElement<{
    children: ReactElement<{ children?: string }>[];
  }>;
  vi.unstubAllEnvs();
  const initScript = fragment.props.children[1].props.children ?? '';

  // 브라우저처럼 window 가 곧 전역 객체여야 dataLayer 같은 전역 참조가 풀린다
  const window: Record<string, unknown> = {
    navigator: { userAgent: opts.userAgent, webdriver: opts.webdriver },
    localStorage: opts.storage,
    location: { href: opts.href ?? 'https://page0127.com/' },
    URL,
  };
  window.window = window;
  runInNewContext(initScript, window);
  return window;
};

const isDisabled = (opts: Parameters<typeof runGaInit>[0]) =>
  runGaInit(opts)[`ga-disable-${GA_ID}`] === true;

/** gtag('config', ID, 옵션) 으로 넘긴 옵션 — dataLayer 에 arguments 로 쌓인다 */
const configOptions = (opts: Parameters<typeof runGaInit>[0]) => {
  const dataLayer = runGaInit(opts).dataLayer as ArrayLike<unknown>[];
  const config = dataLayer.find((args) => args[0] === 'config');
  return config?.[2] as { page_location?: string } | undefined;
};

const SHARE_URL =
  'https://page0127.com/stronger_deer?utm_source=share&utm_medium=social&utm_campaign=share_library&utm_content=native';
const KAKAO_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0';

const storageWith = (value: string | null) => ({
  getItem: (key: string) => (key === ADMIN_DEVICE_KEY ? value : null),
});

describe('ga-init 전송 차단', () => {
  it('관리자 기기 표시가 있으면 끈다', () => {
    expect(
      isDisabled({ userAgent: DESKTOP_CHROME, storage: storageWith('1') })
    ).toBe(true);
  });

  it('표시가 없는 일반 브라우저는 그대로 보낸다', () => {
    expect(
      isDisabled({ userAgent: DESKTOP_CHROME, storage: storageWith(null) })
    ).toBe(false);
  });

  it('자동화 브라우저(navigator.webdriver)는 UA 가 평범해도 끈다', () => {
    expect(
      isDisabled({
        userAgent: DESKTOP_CHROME,
        storage: storageWith(null),
        webdriver: true,
      })
    ).toBe(true);
  });

  it('저장소 접근이 막혀도(시크릿 창 등) 스크립트가 죽지 않는다', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(isDisabled({ userAgent: DESKTOP_CHROME, storage: blocked })).toBe(
      false
    );
  });
});

describe('공유 링크 출처', () => {
  it('카톡 안에서 열면 utm_source 를 kakaotalk 으로 바꿔 보낸다', () => {
    const loc = configOptions({
      userAgent: KAKAO_IPHONE,
      storage: storageWith(null),
      href: SHARE_URL,
    })?.page_location;
    expect(new URL(loc ?? '').searchParams.get('utm_source')).toBe('kakaotalk');
  });

  it('앱 밖 브라우저로 열면 주소를 그대로 둔다', () => {
    expect(
      configOptions({
        userAgent: DESKTOP_CHROME,
        storage: storageWith(null),
        href: SHARE_URL,
      })?.page_location
    ).toBeUndefined();
  });

  it('공유 링크가 아니면 인앱이어도 건드리지 않는다', () => {
    expect(
      configOptions({
        userAgent: KAKAO_IPHONE,
        storage: storageWith(null),
        href: 'https://page0127.com/?utm_source=instagram_bio',
      })?.page_location
    ).toBeUndefined();
  });
});

describe('MEASUREMENT_UA_PATTERN', () => {
  it('Lighthouse·헤드리스 크롬은 측정 도구로 본다', () => {
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse'
      )
    ).toBe(true);
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });

  it('일반 사용자 브라우저는 그대로 보낸다', () => {
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});

describe('isNonProductionEnv', () => {
  const env = (vars: Record<string, string>) =>
    vars as unknown as NodeJS.ProcessEnv;

  it('로컬 개발 서버·Vercel 미리보기에서는 GA 를 넣지 않는다', () => {
    expect(isNonProductionEnv(env({ NODE_ENV: 'development' }))).toBe(true);
    expect(
      isNonProductionEnv(env({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }))
    ).toBe(true);
  });

  it('운영 배포와 VERCEL_ENV 없는 빌드는 그대로 둔다', () => {
    expect(
      isNonProductionEnv(
        env({ NODE_ENV: 'production', VERCEL_ENV: 'production' })
      )
    ).toBe(false);
    expect(isNonProductionEnv(env({ NODE_ENV: 'production' }))).toBe(false);
  });
});
