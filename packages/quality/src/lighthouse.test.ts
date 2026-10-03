import { describe, expect, it } from 'vitest';

import { extractEnvironment, median } from './lighthouse';

describe('median', () => {
  it('빈 배열은 0', () => {
    expect(median([])).toBe(0);
  });

  it('단일 표본은 그 값', () => {
    expect(median([42])).toBe(42);
  });

  it('홀수 표본은 가운데 값', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('짝수 표본은 두 가운데의 평균(반올림)', () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 → 3
  });

  it('LCP 노이즈(11.6/37.9/17.6s)에서 극단 38s에 휘둘리지 않는다', () => {
    expect(median([11600, 37900, 17600])).toBe(17600);
  });
});

describe('extractEnvironment', () => {
  it('헤드리스 UA 에서도 Chrome 버전을 꺼내고, 러너 이미지를 함께 남긴다', () => {
    const env = extractEnvironment(
      {
        lighthouseVersion: '13.5.0',
        environment: {
          hostUserAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.8037.57 Safari/537.36',
          benchmarkIndex: 1532.4,
        },
      },
      '20260927.320.1'
    );
    expect(env).toEqual({
      chromeVersion: '154.0.8037.57',
      lighthouseVersion: '13.5.0',
      runnerImage: '20260927.320.1',
      benchmarkIndex: 1532,
    });
  });

  it('정보가 없으면 unknown/local 로 남긴다 — 빈 문자열로 "같음" 판정되지 않게', () => {
    expect(extractEnvironment({}, undefined)).toEqual({
      chromeVersion: 'unknown',
      lighthouseVersion: 'unknown',
      runnerImage: 'local',
      benchmarkIndex: 0,
    });
  });
});
