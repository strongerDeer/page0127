import { describe, expect, it } from 'vitest';

import { analyze } from './analyze';
import type { QualityRecord } from './types';

const base: QualityRecord = {
  timestamp: '2026-05-19T09:00:00Z',
  app: 'shop',
  env: 'production',
  targetUrl: 'https://shop.novera.town',
  gitRef: 'old',
  pages: [
    { name: 'home', url: 'https://shop.novera.town/ko',
      lighthouse: { performance: 90, accessibility: 90, bestPractices: 90, seo: 100 },
      cwv: { lcp: 2000, cls: 0.05, tbt: 150, fcp: 1000, si: 2000 },
      weight: { totalKb: 1000, imageKb: 400, scriptKb: 300 }, samples: 3, lcpSpreadMs: 300 },
  ],
  bundle: { totalFirstLoadKb: 200, routes: [{ route: '/', firstLoadKb: 200 }] },
  buildTimeSec: 40,
  seo: { hreflangValid: true, canonicalValid: true, sitemapOk: true, robotsOk: true, jsonLdPresent: true, brokenLinks: 0 },
  runtime: { consoleErrors: 0, consoleWarnings: 0, failedRequests: 0, hydrationWarnings: 0 },
  codeHealth: { tscErrors: 0, eslintErrors: 0, eslintWarnings: 0, todoFixme: 0 },
};

// 회귀 감지는 "새 배포본(gitRef 변경) vs 직전"이 정상 시나리오다.
// 같은 gitRef면 코드 무변경 → 회귀 단정 금지(별도 describe에서 검증).
const nextDeploy = (): QualityRecord => {
  const curr = structuredClone(base);
  curr.gitRef = 'new';
  return curr;
};

describe('analyze', () => {
  it('직전 대비 Performance 8점 이상 하락을 회귀로 잡는다', () => {
    const curr = nextDeploy();
    curr.pages[0].lighthouse.performance = 80; // -10 (임계 8 초과)
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'performance' && r.page === 'home')).toBe(true);
  });

  it('Performance가 8점 미만 하락이면 회귀로 잡지 않는다(노이즈)', () => {
    const curr = nextDeploy();
    curr.pages[0].lighthouse.performance = 84; // -6 (임계 8 미만)
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'performance')).toBe(false);
  });

  it('번들 10% 이상 증가를 회귀로 잡는다', () => {
    const curr = nextDeploy();
    curr.bundle.totalFirstLoadKb = 230; // +15%
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'bundle')).toBe(true);
  });

  it('LCP가 노이즈 밴드를 넘게 직전 대비 악화되면 회귀로 잡는다', () => {
    const curr = nextDeploy();
    curr.pages[0].cwv.lcp = 4500; // +2500ms > 밴드(max(spread 300, 1500))
    curr.pages[0].lcpSpreadMs = 300;
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'lcp' && r.page === 'home')).toBe(true);
  });

  it('LCP가 노이즈 밴드 안에서 출렁이면 회귀로 잡지 않는다(허위경보 방지)', () => {
    const curr = nextDeploy();
    curr.pages[0].cwv.lcp = 30000; // 절대값은 크지만
    curr.pages[0].lcpSpreadMs = 40000; // 표본 흔들림이 그보다 커서 신뢰 불가
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'lcp')).toBe(false);
  });

  it('총 전송 바이트 15% 이상 증가를 회귀로 잡는다(안정 지표)', () => {
    const curr = nextDeploy();
    curr.pages[0].weight!.totalKb = 1200; // +20%
    curr.pages[0].weight!.imageKb = 600; // 이미지가 주범
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.metric === 'weight' && r.page === 'home')).toBe(true);
  });

  it('이미지가 줄면 trend.weight는 improving이다', () => {
    const curr = nextDeploy();
    curr.pages[0].weight!.totalKb = 600; // 1000→600 감소
    curr.pages[0].weight!.imageKb = 100;
    expect(analyze([base, curr]).trend.weight).toBe('improving');
  });

  it('변화 없으면 회귀가 없고 추세는 flat이다', () => {
    const curr = nextDeploy();
    const result = analyze([base, curr]);
    expect(result.regressions).toHaveLength(0);
    expect(result.trend.performance).toBe('flat');
  });

  it('레코드가 1건이면 회귀 없이 baseline을 반환한다', () => {
    const result = analyze([base]);
    expect(result.regressions).toHaveLength(0);
    expect(result.isBaseline).toBe(true);
  });

  it('빈 history면 throw 한다', () => {
    expect(() => analyze([])).toThrow();
  });

  it('번들 증가 시 trend.bundle은 degrading이다', () => {
    const curr = nextDeploy();
    curr.bundle.totalFirstLoadKb = 230;
    expect(analyze([base, curr]).trend.bundle).toBe('degrading');
  });

  it('CLS 임계(0.1) 초과를 회귀로 잡는다', () => {
    const curr = nextDeploy();
    curr.pages[0].cwv.cls = 0.2;
    expect(analyze([base, curr]).regressions.some((r) => r.metric === 'cls')).toBe(true);
  });

  it('TBT가 임계를 넘고 노이즈 밴드보다 크게 직전 대비 악화되면 회귀로 잡는다', () => {
    const curr = nextDeploy();
    curr.pages[0].cwv.tbt = 350; // 150→350, +200ms > 밴드(max(spread 100, 100))
    curr.pages[0].tbtSpreadMs = 100;
    expect(analyze([base, curr]).regressions.some((r) => r.metric === 'tbt')).toBe(true);
  });

  it('TBT가 임계를 넘어도 노이즈 밴드 안에서 출렁이면 회귀로 잡지 않는다(허위경보 방지)', () => {
    const curr = nextDeploy();
    curr.pages[0].cwv.tbt = 213; // 절대값은 200 초과지만 (실측 사례: 121→213)
    curr.pages[0].tbtSpreadMs = 150; // 직전 대비 +63ms 는 표본 흔들림(±150) 안
    expect(analyze([base, curr]).regressions.some((r) => r.metric === 'tbt')).toBe(false);
  });
});

// 데스크탑 페이지 1건을 붙인 레코드. 모바일보다 스로틀이 약해 수치가 좋다.
const withDesktop = (r: QualityRecord): QualityRecord => {
  const clone = structuredClone(r);
  clone.desktopPages = [
    {
      name: 'home',
      url: 'https://shop.novera.town/ko',
      formFactor: 'desktop',
      lighthouse: {
        performance: 95,
        accessibility: 90,
        bestPractices: 90,
        seo: 100,
      },
      cwv: { lcp: 900, cls: 0.01, tbt: 80, fcp: 400, si: 800 },
      weight: { totalKb: 1000, imageKb: 400, scriptKb: 300 },
      samples: 3,
      lcpSpreadMs: 50,
      tbtSpreadMs: 10,
    },
  ];
  return clone;
};

describe('analyze — 데스크탑 폼팩터', () => {
  it('직전에 데스크탑이 없으면(첫 데스크탑 측정) 회귀로 잡지 않는다', () => {
    const curr = withDesktop(nextDeploy());
    const result = analyze([base, curr]);
    expect(result.regressions.some((r) => r.formFactor === 'desktop')).toBe(
      false
    );
  });

  it('데스크탑끼리 비교해 Performance 하락을 회귀로 잡는다', () => {
    const prev = withDesktop(base);
    const curr = withDesktop(nextDeploy());
    curr.desktopPages![0].lighthouse.performance = 85; // 95 → 85 (-10)
    const result = analyze([prev, curr]);
    const reg = result.regressions.find((r) => r.formFactor === 'desktop');
    expect(reg?.metric).toBe('performance');
    expect(reg?.detail).toContain('[desktop]');
  });

  it('데스크탑 LCP는 모바일보다 좁은 노이즈 밴드(500ms)로 판정한다', () => {
    const prev = withDesktop(base);
    const curr = withDesktop(nextDeploy());
    // +700ms: 모바일 밴드(1500ms)면 안 잡히지만 데스크탑 밴드(500ms)로는 잡힌다.
    curr.desktopPages![0].cwv.lcp = 1600;
    const result = analyze([prev, curr]);
    expect(
      result.regressions.some(
        (r) => r.metric === 'lcp' && r.formFactor === 'desktop'
      )
    ).toBe(true);
  });

  it('데스크탑 TBT는 임계 150ms 기준으로 판정한다(모바일 200ms보다 엄격)', () => {
    const prev = withDesktop(base);
    const curr = withDesktop(nextDeploy());
    // 80 → 160ms: 모바일 임계(200)면 안 잡히지만 데스크탑 임계(150)는 넘는다.
    curr.desktopPages![0].cwv.tbt = 160;
    const result = analyze([prev, curr]);
    expect(
      result.regressions.some(
        (r) => r.metric === 'tbt' && r.formFactor === 'desktop'
      )
    ).toBe(true);
  });

  it('모바일 회귀와 데스크탑 회귀가 formFactor로 구분된다', () => {
    const prev = withDesktop(base);
    const curr = withDesktop(nextDeploy());
    curr.pages[0].lighthouse.performance = 80; // 모바일 -10
    curr.desktopPages![0].lighthouse.performance = 85; // 데스크탑 -10
    const result = analyze([prev, curr]);
    const perf = result.regressions.filter((r) => r.metric === 'performance');
    expect(perf).toHaveLength(2);
    expect(perf.map((r) => r.formFactor).sort()).toEqual([
      'desktop',
      'mobile',
    ]);
  });

  it('데스크탑 수치가 모바일보다 좋아도 폼팩터를 섞어 개선으로 판정하지 않는다', () => {
    // 모바일 LCP 2000ms 유지, 데스크탑 900ms. 섞어 비교하면 거대한 '개선'이 잡힌다.
    const prev = withDesktop(base);
    const curr = withDesktop(nextDeploy());
    const result = analyze([prev, curr]);
    expect(result.regressions).toHaveLength(0);
  });
});

describe('analyze — 같은 배포본 재측정(sameDeployment)', () => {
  it('gitRef가 직전과 같으면 코드 회귀가 아니므로 변동을 regressions로 잡지 않는다', () => {
    const curr = structuredClone(base); // gitRef 'old' 유지 → 동일 배포본
    curr.pages[0].lighthouse.performance = 70; // -20
    curr.pages[0].cwv.lcp = 20000; // +18000ms
    const result = analyze([base, curr]);
    expect(result.sameDeployment).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it('같은 배포본이면 잡혔을 회귀를 suppressedRegressions에 관찰용으로 보존한다', () => {
    const curr = structuredClone(base);
    curr.pages[0].lighthouse.performance = 70; // -20 (임계 초과지만 동일 배포본)
    const result = analyze([base, curr]);
    expect(result.sameDeployment).toBe(true);
    expect(result.suppressedRegressions.some((r) => r.metric === 'performance')).toBe(true);
  });

  it("gitRef가 'unknown'으로 같으면 해석 실패 sentinel이라 동일 배포본으로 보지 않고 회귀 감지를 유지한다", () => {
    const prev = structuredClone(base);
    prev.gitRef = 'unknown';
    const curr = structuredClone(base);
    curr.gitRef = 'unknown';
    curr.pages[0].lighthouse.performance = 70; // -20
    const result = analyze([prev, curr]);
    expect(result.sameDeployment).toBe(false);
    expect(result.regressions.some((r) => r.metric === 'performance')).toBe(true);
  });
});
