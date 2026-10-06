import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

import {
  ADMIN_DEVICE_KEY,
  GoogleAnalytics,
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
const runGaInit = (opts: { userAgent: string; storage: unknown }) => {
  vi.stubEnv('NEXT_PUBLIC_GA_ID', GA_ID);
  const fragment = GoogleAnalytics() as ReactElement<{
    children: ReactElement<{ children?: string }>[];
  }>;
  vi.unstubAllEnvs();
  const initScript = fragment.props.children[1].props.children ?? '';

  // 브라우저처럼 window 가 곧 전역 객체여야 dataLayer 같은 전역 참조가 풀린다
  const window: Record<string, unknown> = {
    navigator: { userAgent: opts.userAgent },
    localStorage: opts.storage,
  };
  window.window = window;
  runInNewContext(initScript, window);
  return window[`ga-disable-${GA_ID}`] === true;
};

const storageWith = (value: string | null) => ({
  getItem: (key: string) => (key === ADMIN_DEVICE_KEY ? value : null),
});

describe('ga-init 전송 차단', () => {
  it('관리자 기기 표시가 있으면 끈다', () => {
    expect(
      runGaInit({ userAgent: DESKTOP_CHROME, storage: storageWith('1') })
    ).toBe(true);
  });

  it('표시가 없는 일반 브라우저는 그대로 보낸다', () => {
    expect(
      runGaInit({ userAgent: DESKTOP_CHROME, storage: storageWith(null) })
    ).toBe(false);
  });

  it('저장소 접근이 막혀도(시크릿 창 등) 스크립트가 죽지 않는다', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(runGaInit({ userAgent: DESKTOP_CHROME, storage: blocked })).toBe(
      false
    );
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
