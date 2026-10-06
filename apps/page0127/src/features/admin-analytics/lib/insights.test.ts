import { describe, expect, it } from 'vitest';

import {
  buildHeadline,
  buildInsights,
  type DailyPoint,
  fillDaily,
  isDatacenterCity,
  type Reports,
  weekOverWeek,
} from './insights';

import type { ReportTable } from './ga4Reports';

/** [원본 값, 측정항목...] 배열로 표를 만든다 */
const table = (...rows: [string | string[], ...number[]][]): ReportTable => ({
  rows: rows.map(([raw, ...values]) => {
    const r = Array.isArray(raw) ? raw : [raw];
    return { raw: r, labels: r, values };
  }),
});

const empty = table();

const reports = (over: Partial<Reports>): Reports => ({
  summary: table(['', 100]),
  daily: empty,
  channel: empty,
  sourceMedium: empty,
  country: empty,
  city: empty,
  pages: empty,
  landingBounce: empty,
  device: empty,
  browser: empty,
  os: empty,
  resolution: empty,
  dayOfWeek: empty,
  gender: empty,
  age: empty,
  ...over,
});

const titles = (r: Reports, daily: DailyPoint[] = []) =>
  buildInsights(r, daily).map((i) => i.title);

describe('buildHeadline', () => {
  it('국내·검색·모바일·데이터센터 비율을 원본 값으로 센다', () => {
    const h = buildHeadline(
      reports({
        country: table(['KR', 60], ['US', 40]),
        channel: table(
          ['Direct', 50],
          ['Organic Search', 25],
          ['Referral', 25]
        ),
        device: table(['mobile', 70], ['desktop', 30]),
        city: table([['Seoul', 'KR'], 50], [['Boardman', 'US'], 50]),
      })
    );
    expect(h).toEqual({
      users: 100,
      domesticShare: 0.6,
      searchShare: 0.25,
      mobileShare: 0.7,
      datacenterShare: 0.5,
    });
  });
  it('데이터가 없으면 0 (0 으로 나누지 않는다)', () => {
    expect(buildHeadline(reports({})).searchShare).toBe(0);
  });
});

describe('isDatacenterCity', () => {
  it('GitHub 러너(Azure)·봇 위치로 확인된 도시를 데이터센터로 본다', () => {
    // 2026-10-06 유입분석: 셋이 합쳐 사용자 56% — 매주 품질 측정 횟수와 맞았다
    expect(isDatacenterCity('Des Moines')).toBe(true);
    expect(isDatacenterCity('Flint Hill')).toBe(true);
    expect(isDatacenterCity('Moses Lake')).toBe(true);
    expect(isDatacenterCity('Seoul')).toBe(false);
  });
});

describe('fillDaily', () => {
  it('GA 가 빼먹은 0명인 날을 채우고, 어제까지 28칸을 만든다', () => {
    const points = fillDaily(
      table(['20261004', 5]),
      new Date('2026-10-06T03:00:00Z') // KST 10/6 정오 → 어제 = 10/5
    );
    expect(points).toHaveLength(28);
    expect(points.at(-1)).toEqual({
      date: '20261005',
      label: '10/05',
      users: 0,
    });
    expect(points.at(-2)).toEqual({
      date: '20261004',
      label: '10/04',
      users: 5,
    });
  });
});

describe('weekOverWeek', () => {
  const pts = (prev: number, last: number): DailyPoint[] =>
    Array.from({ length: 14 }, (_, i) => ({
      date: String(i),
      label: String(i),
      users: i < 7 ? prev : last,
    }));
  it('최근 7일 / 앞 7일 - 1', () => {
    expect(weekOverWeek(pts(10, 15))).toBeCloseTo(0.5);
  });
  it('앞 주가 0 이면 비교하지 않는다', () => {
    expect(weekOverWeek(pts(0, 5))).toBeNull();
  });
});

describe('buildInsights', () => {
  it('사용자가 적으면 해석을 보류한다고만 말한다', () => {
    const out = buildInsights(reports({ summary: table(['', 3]) }), []);
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain('3명');
  });

  it('데이터센터 도시가 많으면 봇 섞임을 경고한다', () => {
    const t = titles(
      reports({ city: table([['Boardman', 'US'], 30], [['Seoul', 'KR'], 70]) })
    );
    expect(t.some((s) => s.includes('사람이 아닌 방문'))).toBe(true);
  });

  it('검색 비율이 낮으면 경고, 직접 방문이 많으면 utm 안내', () => {
    const t = titles(
      reports({ channel: table(['Direct', 90], ['Organic Search', 5]) })
    );
    expect(t.some((s) => s.includes('검색으로 들어온 방문이 5%'))).toBe(true);
    expect(t.some((s) => s.includes("'직접 방문'"))).toBe(true);
  });

  it('표본 10세션 이상 중 이탈률이 가장 높은 첫 페이지 하나만 짚는다', () => {
    const t = titles(
      reports({
        landingBounce: table(['/a', 20, 0.7], ['/b', 30, 0.9], ['/c', 3, 1]),
      })
    );
    const bounce = t.filter((s) => s.includes('바로 떠났습니다'));
    expect(bounce).toEqual(['/b 로 들어온 사람의 90%가 바로 떠났습니다']);
  });

  it('지난주 대비 20% 이상 변하면 알린다', () => {
    const daily = Array.from({ length: 14 }, (_, i) => ({
      date: String(i),
      label: String(i),
      users: i < 7 ? 10 : 5,
    }));
    const t = titles(reports({}), daily);
    expect(t.some((s) => s.includes('50% 줄었습니다'))).toBe(true);
  });
});
