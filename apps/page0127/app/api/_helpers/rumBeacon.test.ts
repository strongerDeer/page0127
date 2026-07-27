import { describe, expect, it } from 'vitest';

import {
  detectBrowser,
  detectFormFactor,
  isBotUserAgent,
  parseRumBeacon,
  type RumBeaconContext,
} from './rumBeacon';

const CHROME_MOBILE =
  'Mozilla/5.0 (Linux; Android 14; SM-S926N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
const EDGE_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0';

const context: RumBeaconContext = {
  userAgent: CHROME_MOBILE,
  env: 'production',
  release: 'abc1234',
};

const PROFILE_BOOK_PATH = '/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54';

// 경로는 샘플마다 붙는다 — CLS·INP는 클라이언트 라우팅 이후에 확정될 수 있어서.
const sample = (overrides: Record<string, unknown> = {}) => ({
  path: PROFILE_BOOK_PATH,
  metric: 'lcp',
  value: 1234.5,
  rating: 'good',
  id: 'v5-1-1',
  ...overrides,
});

const body = (overrides: Record<string, unknown> = {}) => ({
  sessionId: 'sess-1',
  samples: [sample()],
  ...overrides,
});

describe('isBotUserAgent', () => {
  it('실사용자 브라우저는 통과시킨다', () => {
    expect(isBotUserAgent(CHROME_MOBILE)).toBe(false);
    expect(isBotUserAgent(SAFARI_IOS)).toBe(false);
  });

  // 합성 측정을 저장하면 필드 지표에 랩 수치가 섞여 정의가 깨진다.
  it('봇·합성 측정·스크립트를 막는다', () => {
    expect(isBotUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/135.0.0.0')).toBe(true);
    expect(isBotUserAgent('curl/8.4.0')).toBe(true);
    expect(isBotUserAgent('node-fetch/3.3.2')).toBe(true);
  });

  it('UA가 아예 없으면 스크립트로 본다', () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent('')).toBe(true);
  });
});

describe('detectFormFactor', () => {
  it('모바일과 데스크탑을 가른다', () => {
    expect(detectFormFactor(CHROME_MOBILE)).toBe('mobile');
    expect(detectFormFactor(SAFARI_IOS)).toBe('mobile');
    expect(detectFormFactor(CHROME_DESKTOP)).toBe('desktop');
    expect(detectFormFactor(null)).toBe('desktop');
  });
});

describe('detectBrowser', () => {
  // Edge UA에는 Chrome과 Safari가, Chrome UA에는 Safari가 들어 있다.
  // 순서를 뒤집으면 Edge 사용자가 전부 Chrome으로 집계된다.
  it('겹치는 UA 토큰을 좁은 것부터 판정한다', () => {
    expect(detectBrowser(EDGE_DESKTOP)).toBe('edge');
    expect(detectBrowser(CHROME_DESKTOP)).toBe('chrome');
    expect(detectBrowser(SAFARI_IOS)).toBe('safari');
  });

  it('알 수 없으면 other다', () => {
    expect(detectBrowser(null)).toBe('other');
    expect(detectBrowser('SomeUnknownAgent/1.0')).toBe('other');
  });
});

describe('parseRumBeacon — 본문 형태', () => {
  it('정상 본문을 샘플로 바꾼다', () => {
    const result = parseRumBeacon(body(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples).toHaveLength(1);
    expect(result.samples[0]).toMatchObject({
      metric: 'lcp',
      value: 1234.5,
      rating: 'good',
      metricId: 'v5-1-1',
      formFactor: 'mobile',
      browser: 'chrome',
      sessionId: 'sess-1',
      env: 'production',
      release: 'abc1234',
    });
  });

  it('형태가 아예 잘못된 본문은 400이다', () => {
    expect(parseRumBeacon(null, context)).toMatchObject({ status: 400 });
    expect(parseRumBeacon('nope', context)).toMatchObject({ status: 400 });
    expect(
      parseRumBeacon(body({ sessionId: undefined }), context)
    ).toMatchObject({ status: 400 });
    expect(parseRumBeacon(body({ samples: [] }), context)).toMatchObject({
      status: 400,
    });
    expect(parseRumBeacon(body({ samples: 'nope' }), context)).toMatchObject({
      status: 400,
    });
  });

  it('배치가 너무 크면 413이다', () => {
    const samples = Array.from({ length: 9 }, (_, i) =>
      sample({ id: `v5-1-${i}` })
    );
    expect(parseRumBeacon(body({ samples }), context)).toMatchObject({
      status: 413,
    });
  });
});

describe('parseRumBeacon — 값 검증', () => {
  const parseOne = (overrides: Record<string, unknown>) => {
    const result = parseRumBeacon(
      body({ samples: [sample(overrides)] }),
      context
    );
    return result.ok ? result.samples : [];
  };

  // 비콘은 재시도가 없다. 하나 때문에 전부 400을 주면 멀쩡한 지표까지 잃는다.
  it('규칙에 어긋나는 샘플만 버리고 나머지는 살린다', () => {
    const result = parseRumBeacon(
      body({
        samples: [
          sample({ metric: 'lcp', value: 1000, id: 'a' }),
          sample({ metric: 'notametric', value: 1000, id: 'b' }),
          sample({ metric: 'cls', value: 0.05, id: 'c' }),
        ],
      }),
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples.map((s) => s.metric)).toEqual(['lcp', 'cls']);
  });

  it('path가 없거나 상대경로인 샘플은 버린다', () => {
    expect(parseOne({ path: undefined })).toHaveLength(0);
    expect(parseOne({ path: 'relative' })).toHaveLength(0);
  });

  it('지표 이름을 화이트리스트로 막는다', () => {
    expect(parseOne({ metric: 'tbt' })).toHaveLength(0);
    expect(parseOne({ metric: 'inp', value: 100 })).toHaveLength(1);
  });

  it('숫자가 아니거나 음수·NaN인 값을 막는다', () => {
    expect(parseOne({ value: '1000' })).toHaveLength(0);
    expect(parseOne({ value: -1 })).toHaveLength(0);
    expect(parseOne({ value: Number.NaN })).toHaveLength(0);
    expect(parseOne({ value: Number.POSITIVE_INFINITY })).toHaveLength(0);
  });

  // CLS는 무단위 누적값이라 스케일이 다른 지표와 완전히 다르다.
  it('지표별 상한을 따로 적용한다', () => {
    expect(parseOne({ metric: 'lcp', value: 599_000 })).toHaveLength(1);
    expect(parseOne({ metric: 'lcp', value: 999_999 })).toHaveLength(0);
    expect(parseOne({ metric: 'cls', value: 5 })).toHaveLength(1);
    expect(parseOne({ metric: 'cls', value: 50 })).toHaveLength(0);
  });

  it('id가 없거나 너무 길면 버린다', () => {
    expect(parseOne({ id: undefined })).toHaveLength(0);
    expect(parseOne({ id: 'x'.repeat(65) })).toHaveLength(0);
  });

  it('알 수 없는 rating·navigationType은 저장하지 않고 샘플은 살린다', () => {
    const [parsed] = parseOne({
      rating: 'excellent',
      navigationType: 'teleport',
    });
    expect(parsed).toBeDefined();
    expect(parsed?.rating).toBeUndefined();
    expect(parsed?.navigationType).toBeUndefined();
  });

  it('알려진 navigationType은 보존한다', () => {
    expect(parseOne({ navigationType: 'back-forward-cache' })[0]).toMatchObject(
      { navigationType: 'back-forward-cache' }
    );
    expect(parseOne({ navigationType: 'soft-navigation' })[0]).toMatchObject({
      navigationType: 'soft-navigation',
    });
  });

  it('attribution이 너무 크면 떼어내고 샘플은 살린다', () => {
    const [ok] = parseOne({ attribution: { target: 'img.hero' } });
    expect(ok?.attribution).toEqual({ target: 'img.hero' });

    const [big] = parseOne({ attribution: { blob: 'x'.repeat(3000) } });
    expect(big).toBeDefined();
    expect(big?.attribution).toBeUndefined();
  });
});

describe('parseRumBeacon — 경로 정규화', () => {
  // 클라이언트가 보낸 route 문자열을 믿으면 임의 값으로 카디널리티를 터뜨릴 수 있다.
  it('서버가 path를 패턴으로 접는다', () => {
    const result = parseRumBeacon(body(), context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples[0]?.route).toBe('/[username]/[bookId]');
  });

  it('클라이언트가 보낸 route 필드는 무시한다', () => {
    const result = parseRumBeacon(
      body({ samples: [sample({ route: '/내가/정한/아무/문자열' })] }),
      context
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples[0]?.route).toBe('/[username]/[bookId]');
  });

  // CLS·INP는 클라이언트 라우팅 뒤에 확정될 수 있어 한 비콘 안에 경로가 섞인다.
  it('샘플마다 다른 경로를 각각 정규화한다', () => {
    const result = parseRumBeacon(
      body({
        samples: [
          sample({ metric: 'lcp', id: 'a', path: '/books/all' }),
          sample({ metric: 'cls', value: 0.05, id: 'b', path: PROFILE_BOOK_PATH }),
        ],
      }),
      context
    );
    if (!result.ok) throw new Error('파싱 실패');
    expect(result.samples.map((s) => s.route)).toEqual([
      '/books/all',
      '/[username]/[bookId]',
    ]);
  });

  it('사용자명과 책 id를 저장 값에 남기지 않는다', () => {
    const result = parseRumBeacon(body(), context);
    if (!result.ok) throw new Error('파싱 실패');
    const serialized = JSON.stringify(result.samples);
    expect(serialized).not.toContain('dreamfulbud');
    expect(serialized).not.toContain('80a21270');
  });
});

describe('parseRumBeacon — 서버가 정하는 값', () => {
  it('클라이언트가 env·release를 정할 수 없다', () => {
    const result = parseRumBeacon(
      body({ samples: [sample({ env: 'production', release: 'fake' })] }),
      { userAgent: CHROME_DESKTOP, env: 'development' }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples[0]?.env).toBe('development');
    expect(result.samples[0]?.release).toBeUndefined();
  });

  it('클라이언트가 formFactor·browser를 정할 수 없다 (UA로만 판정)', () => {
    const result = parseRumBeacon(
      body({ samples: [sample({ formFactor: 'mobile', browser: 'firefox' })] }),
      { userAgent: CHROME_DESKTOP, env: 'production' }
    );
    if (!result.ok) throw new Error('파싱 실패');
    expect(result.samples[0]?.formFactor).toBe('desktop');
    expect(result.samples[0]?.browser).toBe('chrome');
  });
});
