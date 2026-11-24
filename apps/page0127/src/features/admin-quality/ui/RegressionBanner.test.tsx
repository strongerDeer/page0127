import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { RegressionBanner } from './RegressionBanner';

import type { QualityRecord } from '@repo/quality/types';

/**
 * 자연어 분석이 실패해도(예: 2026-11-02 API 키 401) 회귀 배너만 보고
 * "환경이 바뀐 주"라는 걸 알 수 있어야 한다.
 */
const env = (chrome: string, lh: string) => ({
  chromeVersion: chrome,
  lighthouseVersion: lh,
  runnerImage: 'r1',
  benchmarkIndex: 3000,
});

const make = (environment: ReturnType<typeof env>): QualityRecord =>
  ({
    regressions: [{ detail: 'library TBT 133→338ms' }],
    environment,
  }) as unknown as QualityRecord;

describe('RegressionBanner', () => {
  it('직전과 측정 환경이 다르면 환경 영향 안내를 붙인다', () => {
    const html = renderToStaticMarkup(
      <RegressionBanner
        record={make(env('156.0.0.0', '13.6.0'))}
        previous={make(env('155.0.0.0', '13.5.0'))}
      />
    );
    expect(html).toContain('측정 환경이 바뀌었어요');
    expect(html).toContain('Chrome 155.0.0.0→156.0.0.0');
    expect(html).toContain('Lighthouse 13.5.0→13.6.0');
  });

  it('환경이 같으면 안내를 붙이지 않는다', () => {
    const html = renderToStaticMarkup(
      <RegressionBanner
        record={make(env('156.0.0.0', '13.6.0'))}
        previous={make(env('156.0.0.0', '13.6.0'))}
      />
    );
    expect(html).toContain('회귀 1건 감지');
    expect(html).not.toContain('측정 환경');
  });

  it('회귀가 없어도 러너 CPU 차이로 보류한 TBT 가 있으면 알린다', () => {
    const record = {
      regressions: [],
      suppressedRegressions: [
        { metric: 'tbt', detail: 'library TBT 293→519ms' },
      ],
      environment: { ...env('157.0.0.0', '13.6.0'), benchmarkIndex: 2466 },
    } as unknown as QualityRecord;
    const html = renderToStaticMarkup(
      <RegressionBanner
        record={record}
        previous={make({ ...env('157.0.0.0', '13.6.0'), benchmarkIndex: 3011 })}
      />
    );
    expect(html).toContain('러너 성능지수 3011→2466(-18%)');
    expect(html).toContain('library TBT 293→519ms');
    expect(html).not.toContain('회귀 1건 감지');
  });
});
