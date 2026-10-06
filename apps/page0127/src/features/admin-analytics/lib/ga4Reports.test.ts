import { describe, expect, it } from 'vitest';

import {
  formatMetric,
  parseReport,
  REPORTS,
  toRunReportRequest,
  translateDimension,
} from './ga4Reports';

const def = (key: string) => {
  const d = REPORTS.find((r) => r.key === key);
  if (!d) throw new Error(key);
  return d;
};

describe('toRunReportRequest', () => {
  it('정렬 지정이 없으면 첫 측정항목 내림차순', () => {
    const req = toRunReportRequest(def('country'));
    expect(req.orderBys).toEqual([
      { metric: { metricName: 'activeUsers' }, desc: true },
    ]);
    expect(req.dimensions).toEqual([{ name: 'countryId' }]);
  });
  it('요일은 차원 순(일→토)으로 정렬한다', () => {
    expect(toRunReportRequest(def('dayOfWeek')).orderBys).toEqual([
      { dimension: { dimensionName: 'dayOfWeek' } },
    ]);
  });
});

describe('parseReport', () => {
  it('GA 문자열 숫자를 number 로, 차원 값을 한국어로 바꾼다', () => {
    const table = parseReport(def('dayOfWeek'), [
      {
        dimensionValues: [{ value: '0' }],
        metricValues: [{ value: '12' }, { value: '30' }],
      },
    ]);
    expect(table.rows).toEqual([
      { labels: ['일'], raw: ['0'], values: [12, 30] },
    ]);
  });
  it('도시는 도시 이름 + 한국어 국가명, 원본 코드는 raw 에 남긴다', () => {
    const table = parseReport(def('city'), [
      {
        dimensionValues: [{ value: 'Boardman' }, { value: 'US' }],
        metricValues: [{ value: '3' }],
      },
    ]);
    expect(table.rows[0].labels).toEqual(['Boardman', '미국']);
    expect(table.rows[0].raw).toEqual(['Boardman', 'US']);
  });
  it('rows 가 없으면(데이터 0) 빈 표', () => {
    expect(parseReport(def('gender')).rows).toEqual([]);
  });
});

describe('translateDimension', () => {
  it('(not set) 은 알 수 없음으로', () => {
    expect(translateDimension('country', '(not set)')).toBe('(알 수 없음)');
  });
  it('기기·성별 번역, 모르는 값은 그대로', () => {
    expect(translateDimension('deviceCategory', 'mobile')).toBe('모바일');
    expect(translateDimension('userGender', 'female')).toBe('여성');
    expect(translateDimension('browser', 'Chrome')).toBe('Chrome');
  });
  it('국가 코드 → 한국어 국가명, 사전에 없는 코드는 그대로', () => {
    expect(translateDimension('countryId', 'KR')).toBe('대한민국');
    expect(translateDimension('countryId', 'US')).toBe('미국');
    expect(translateDimension('countryId', 'Q1')).toBe('Q1');
  });
  it('채널 그룹 → 한국어, 날짜 → MM/DD', () => {
    expect(translateDimension('sessionDefaultChannelGroup', 'Direct')).toBe(
      '직접 방문'
    );
    expect(translateDimension('date', '20261003')).toBe('10/03');
  });
});

describe('formatMetric', () => {
  it('비율은 0~1 → 퍼센트', () => {
    expect(formatMetric(0.4567, 'percent')).toBe('45.7%');
  });
  it('초는 분·초로', () => {
    expect(formatMetric(42.4, 'seconds')).toBe('42초');
    expect(formatMetric(125, 'seconds')).toBe('2분 5초');
  });
  it('정수는 천 단위 쉼표', () => {
    expect(formatMetric(12345, 'int')).toBe('12,345');
  });
});
