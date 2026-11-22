import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_DEVICE_KEY } from './GoogleAnalytics';
import { MicrosoftClarity } from './MicrosoftClarity';

import type { ReactElement } from 'react';

const CLARITY_ID = 'testid123';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const renderInitScript = () => {
  vi.stubEnv('NEXT_PUBLIC_CLARITY_ID', CLARITY_ID);
  vi.stubEnv('VERCEL_ENV', 'production');
  const element = MicrosoftClarity() as ReactElement<{ children?: string }>;
  return element.props.children ?? '';
};

/**
 * clarity-init 인라인 스크립트를 가짜 window·document 에서 실제로 실행한다.
 * 문자열로 주입되는 스크립트는 타입 검사가 안 되므로 node:vm 으로 돌려 봐야 오타를 잡는다.
 */
const runClarityInit = (opts: {
  userAgent?: string;
  storage?: unknown;
  webdriver?: boolean;
}) => {
  const inserted: { src?: string; async?: number }[] = [];
  const firstScript = {
    parentNode: {
      insertBefore: (node: { src?: string; async?: number }) => {
        inserted.push(node);
      },
    },
  };
  const window: Record<string, unknown> = {
    navigator: {
      userAgent: opts.userAgent ?? DESKTOP_CHROME,
      webdriver: opts.webdriver,
    },
    localStorage: opts.storage ?? { getItem: () => null },
    document: {
      createElement: () => ({}),
      getElementsByTagName: () => [firstScript],
    },
  };
  window.window = window;
  runInNewContext(renderInitScript(), window);
  // 큐에는 arguments 객체가 쌓인다 — 비교하기 쉽게 배열로 바꾼다
  const clarity = window.clarity as { q?: ArrayLike<unknown>[] } | undefined;
  return {
    inserted,
    queue: (clarity?.q ?? []).map((args) => Array.from(args)),
  };
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MicrosoftClarity 렌더 조건', () => {
  it('프로젝트 ID 가 없으면 아무것도 넣지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_CLARITY_ID', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(MicrosoftClarity()).toBeNull();
  });

  it('PR 미리보기 배포에서는 넣지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_CLARITY_ID', CLARITY_ID);
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(MicrosoftClarity()).toBeNull();
  });
});

describe('clarity-init 실행', () => {
  it('일반 브라우저에는 프로젝트 ID 로 태그 스크립트를 붙인다', () => {
    const { inserted, queue } = runClarityInit({});
    expect(inserted).toHaveLength(1);
    expect(inserted[0].src).toBe(
      `https://www.clarity.ms/tag/${CLARITY_ID}?ref=bwt`
    );
    expect(inserted[0].async).toBe(1);
    expect(queue).toHaveLength(0);
  });

  it('관리자 기기에는 스크립트를 붙이지 않는다(운영 콘솔 화면이 녹화되지 않게)', () => {
    const { inserted } = runClarityInit({
      storage: {
        getItem: (k: string) => (k === ADMIN_DEVICE_KEY ? '1' : null),
      },
    });
    expect(inserted).toHaveLength(0);
  });

  it('측정 도구는 스크립트를 붙이되 measurement 태그를 단다', () => {
    const { inserted, queue } = runClarityInit({
      userAgent: `${DESKTOP_CHROME} Chrome-Lighthouse`,
    });
    expect(inserted).toHaveLength(1);
    expect(queue).toEqual([['set', 'measurement', 'true']]);
  });

  it('자동화 브라우저(navigator.webdriver)도 measurement 태그를 단다', () => {
    const { queue } = runClarityInit({ webdriver: true });
    expect(queue).toEqual([['set', 'measurement', 'true']]);
  });

  it('저장소 접근이 막혀도(시크릿 창 등) 스크립트가 죽지 않는다', () => {
    const { inserted } = runClarityInit({
      storage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
      },
    });
    expect(inserted).toHaveLength(1);
  });
});
