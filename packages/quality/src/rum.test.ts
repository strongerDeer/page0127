import { describe, expect, it } from 'vitest';

import {
  normalizeRoute,
  percentile,
  rateRumValue,
  rumConfidence,
  summarizeRum,
  summarizeRumByDay,
} from './rum';

import type { RumMetricName } from './rum';

describe('normalizeRoute', () => {
  it('정적 라우트는 그대로 둔다', () => {
    expect(normalizeRoute('/')).toBe('/');
    expect(normalizeRoute('/about')).toBe('/about');
    expect(normalizeRoute('/books/all')).toBe('/books/all');
    expect(normalizeRoute('/dashboard/taste-analysis')).toBe(
      '/dashboard/taste-analysis'
    );
  });

  it('첫 세그먼트가 알려진 라우트가 아니면 사용자 프로필로 접는다', () => {
    expect(normalizeRoute('/dreamfulbud')).toBe('/[username]');
    expect(
      normalizeRoute('/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54')
    ).toBe('/[username]/[bookId]');
    expect(normalizeRoute('/dreamfulbud/compatibility')).toBe(
      '/[username]/compatibility'
    );
  });

  // 사용자명·책 id가 성능 로그에 남지 않아야 한다(수집 최소화).
  it('사용자명과 id를 결과에 남기지 않는다', () => {
    const route = normalizeRoute(
      '/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54'
    );
    expect(route).not.toContain('dreamfulbud');
    expect(route).not.toContain('80a21270');
  });

  it('부모에 맞는 이름으로 동적 세그먼트를 접는다', () => {
    expect(normalizeRoute('/books/80a21270-ed22-4e3a-a1e9-17f65b361c54')).toBe(
      '/books/[id]'
    );
    expect(normalizeRoute('/feed/80a21270-ed22-4e3a-a1e9-17f65b361c54')).toBe(
      '/feed/[activityId]'
    );
    expect(
      normalizeRoute('/admin/members/80a21270-ed22-4e3a-a1e9-17f65b361c54')
    ).toBe('/admin/members/[id]');
  });

  // 접어 버리면 편집 화면이 상세 화면과 같은 그룹이 되어 "어느 화면이 느린가"가 흐려진다.
  // (라우트 트리 실측: /books/[id]/edit · /[username]/[bookId]/edit)
  it('동적 세그먼트 뒤의 edit을 상세와 분리한다', () => {
    expect(
      normalizeRoute('/dreamfulbud/80a21270-ed22-4e3a-a1e9-17f65b361c54/edit')
    ).toBe('/[username]/[bookId]/edit');
    expect(
      normalizeRoute('/books/80a21270-ed22-4e3a-a1e9-17f65b361c54/edit')
    ).toBe('/books/[id]/edit');
  });

  // 빌드 산출물의 라우트 목록과 1:1로 맞춘 회귀 방어.
  it('실제 라우트 트리 전체를 알려진 패턴으로 접는다', () => {
    const uuid = '80a21270-ed22-4e3a-a1e9-17f65b361c54';
    expect(normalizeRoute(`/books/info/${uuid}`)).toBe('/books/info/[id]');
    expect(normalizeRoute(`/dashboard/taste-analysis/${uuid}`)).toBe(
      '/dashboard/taste-analysis/[id]'
    );
    expect(normalizeRoute('/admin/quality')).toBe('/admin/quality');
    expect(normalizeRoute('/auth/callback')).toBe('/auth/callback');
    expect(normalizeRoute('/books/add')).toBe('/books/add');
  });

  it('쿼리·해시·트레일링 슬래시를 떼어낸다', () => {
    expect(normalizeRoute('/about?utm_source=x')).toBe('/about');
    expect(normalizeRoute('/about#section')).toBe('/about');
    expect(normalizeRoute('/about/')).toBe('/about');
    expect(normalizeRoute('')).toBe('/');
  });

  // 카디널리티가 방문 수만큼 늘어나면 "어느 화면이 느린가"를 그룹핑할 수 없다.
  it('깊거나 낯선 경로도 유계 문자열로 접는다', () => {
    expect(normalizeRoute('/books/a/b/c/d/e/f/g')).toBe('/books/[id]/[id]/[id]');
    expect(normalizeRoute('/dreamfulbud/a/b/c/d')).toBe('/[username]/[bookId]');
  });
});

describe('percentile', () => {
  // 표본 없음을 0으로 만들면 결측이 "완벽한 성능"으로 둔갑한다.
  it('표본이 없으면 undefined다 (0이 아니다)', () => {
    expect(percentile([], 75)).toBeUndefined();
  });

  it('nearest-rank로 실재하는 값을 고른다 (보간하지 않는다)', () => {
    // n=4 → ceil(0.75*4)-1 = 2 → 세 번째 값
    expect(percentile([100, 200, 300, 400], 75)).toBe(300);
    // n=5 → ceil(3.75)-1 = 3 → 네 번째 값
    expect(percentile([10, 20, 30, 40, 50], 75)).toBe(40);
  });

  it('정렬되지 않은 입력도 처리하고 원본을 바꾸지 않는다', () => {
    const values = [400, 100, 300, 200];
    expect(percentile(values, 75)).toBe(300);
    expect(values).toEqual([400, 100, 300, 200]);
  });

  it('표본 1건이면 그 값이다', () => {
    expect(percentile([1234], 75)).toBe(1234);
  });
});

describe('rateRumValue', () => {
  // 경계값은 good에 포함된다(CWV 표준: LCP 2500ms "이하"가 good).
  it('CWV 표준 임계로 등급을 매긴다', () => {
    expect(rateRumValue('lcp', 2500)).toBe('good');
    expect(rateRumValue('lcp', 2501)).toBe('needs-improvement');
    expect(rateRumValue('lcp', 4001)).toBe('poor');
    expect(rateRumValue('cls', 0.1)).toBe('good');
    expect(rateRumValue('inp', 200)).toBe('good');
    expect(rateRumValue('ttfb', 801)).toBe('needs-improvement');
  });
});

describe('rumConfidence', () => {
  it('표본 수에 따라 4단계로 나눈다', () => {
    expect(rumConfidence(0)).toBe('none');
    expect(rumConfidence(9)).toBe('too-few');
    expect(rumConfidence(10)).toBe('low');
    expect(rumConfidence(29)).toBe('low');
    expect(rumConfidence(30)).toBe('ok');
  });
});

const rows = (metric: RumMetricName, values: number[]) =>
  values.map((value) => ({ metric, value }));

describe('summarizeRum', () => {
  // count 0인 항목을 만들면 화면이 "0ms"를 그럴듯하게 그린다.
  it('표본이 없는 지표는 결과에 넣지 않는다', () => {
    expect(summarizeRum([])).toEqual([]);
    const only = summarizeRum(rows('lcp', [1000]));
    expect(only.map((s) => s.metric)).toEqual(['lcp']);
  });

  it('지표별로 p75와 등급 분포를 계산한다', () => {
    // good 3건(≤2500) + poor 1건 → p75는 세 번째 값
    const [lcp] = summarizeRum(rows('lcp', [1000, 2000, 2400, 9000]));
    expect(lcp).toMatchObject({ metric: 'lcp', count: 4, p75: 2400 });
    expect(lcp?.good).toBe(0.75);
    expect(lcp?.needsImprovement).toBe(0);
    expect(lcp?.poor).toBe(0.25);
  });

  it('등급 비율의 합은 1이다', () => {
    const [inp] = summarizeRum(rows('inp', [100, 300, 700, 150]));
    const total =
      (inp?.good ?? 0) + (inp?.needsImprovement ?? 0) + (inp?.poor ?? 0);
    expect(total).toBeCloseTo(1);
  });

  it('지표별 count는 독립이다 (CLS는 Chromium에서만 오므로 표본이 적다)', () => {
    const summaries = summarizeRum([
      ...rows('lcp', [1000, 1100, 1200, 1300]),
      ...rows('cls', [0.05]),
    ]);
    const byMetric = Object.fromEntries(summaries.map((s) => [s.metric, s]));
    expect(byMetric.lcp?.count).toBe(4);
    expect(byMetric.cls?.count).toBe(1);
  });

  it('NaN·Infinity 샘플은 버린다', () => {
    const [lcp] = summarizeRum([
      ...rows('lcp', [1000, 2000]),
      { metric: 'lcp', value: Number.NaN },
      { metric: 'lcp', value: Number.POSITIVE_INFINITY },
    ]);
    expect(lcp?.count).toBe(2);
  });

  it('표본 수에 맞는 신뢰도를 붙인다', () => {
    const [few] = summarizeRum(rows('lcp', [1000, 2000]));
    expect(few?.confidence).toBe('too-few');
    const [many] = summarizeRum(rows('lcp', Array(30).fill(1000)));
    expect(many?.confidence).toBe('ok');
  });

  it('RUM_METRICS 순서를 따른다 (입력 순서에 흔들리지 않는다)', () => {
    const summaries = summarizeRum([
      ...rows('ttfb', [100]),
      ...rows('lcp', [1000]),
      ...rows('cls', [0.01]),
    ]);
    expect(summaries.map((s) => s.metric)).toEqual(['lcp', 'cls', 'ttfb']);
  });
});

describe('summarizeRumByDay', () => {
  const timed = (metric: RumMetricName, day: string, value: number) => ({
    metric,
    value,
    receivedAt: `${day}T12:00:00.000Z`,
  });

  it('요청한 지표만 일별로 접고 날짜 오름차순으로 준다', () => {
    const points = summarizeRumByDay(
      [
        timed('lcp', '2026-07-27', 1000),
        timed('lcp', '2026-07-27', 2000),
        timed('lcp', '2026-07-26', 3000),
        timed('cls', '2026-07-26', 0.5), // 다른 지표는 무시
      ],
      'lcp'
    );
    expect(points).toEqual([
      { day: '2026-07-26', count: 1, p75: 3000 },
      { day: '2026-07-27', count: 2, p75: 2000 },
    ]);
  });

  it('해당 지표 표본이 없으면 빈 배열이다', () => {
    expect(summarizeRumByDay([timed('lcp', '2026-07-27', 1)], 'inp')).toEqual(
      []
    );
  });
});
