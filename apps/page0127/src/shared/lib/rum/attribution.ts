import type { RumMetricName } from '@repo/quality/rum';

/**
 * web-vitals attribution에서 **보낼 값만** 골라낸다.
 *
 * 통째로 보내면 안 되는 이유: attribution에는 `lcpEntry`·`navigationEntry`·
 * `longAnimationFrameEntries` 같은 PerformanceEntry 원본이 들어 있고, 직렬화하면
 * 수 KB다. 서버가 attribution을 2KB에서 자르므로 그대로 보내면 **전부 버려진다**
 * (원인 규명 정보를 얻으려고 attribution 빌드를 쓴 의미가 사라진다).
 *
 * 필드 이름은 web-vitals v6 타입 정의에서 확인한 것이다
 * (`node_modules/web-vitals/dist/modules/types/*.d.ts`).
 */
const ATTRIBUTION_FIELDS: Record<RumMetricName, readonly string[]> = {
  // LCP 하위분해 4종 — CrUX의 lcpBreakdown과 같은 축이라 나란히 비교할 수 있다.
  // "이미지를 줄여라"(resourceLoadDuration)와 "서버가 느리다"(timeToFirstByte)를 가른다.
  lcp: [
    'target',
    'url',
    'timeToFirstByte',
    'resourceLoadDelay',
    'resourceLoadDuration',
    'elementRenderDelay',
  ],
  // INP 3분할 — 입력 지연 / 핸들러 실행 / 다음 페인트까지. 어디를 고쳐야 하는지가 갈린다.
  inp: [
    'interactionTarget',
    'interactionType',
    'inputDelay',
    'processingDuration',
    'presentationDelay',
    'loadState',
  ],
  cls: [
    'largestShiftTarget',
    'largestShiftValue',
    'largestShiftTime',
    'loadState',
  ],
  fcp: ['timeToFirstByte', 'firstByteToFCP', 'loadState'],
  ttfb: [
    'waitingDuration',
    'dnsDuration',
    'connectionDuration',
    'requestDuration',
    'cacheDuration',
  ],
} as const;

// 셀렉터 문자열은 DOM 깊이에 따라 길어질 수 있다.
const MAX_STRING_LENGTH = 200;

/**
 * 위 필드 중 **무단위**인 것. 나머지는 전부 ms다.
 *
 * 값의 크기로 판단하면 안 된다 — `presentationDelay: 8.9`(ms)와
 * `largestShiftValue: 0.0234`(무단위)는 둘 다 10보다 작지만, 전자는 9로 접어야 하고
 * 후자를 접으면 0이 되어 정보가 통째로 사라진다. 그래서 필드 이름으로 가른다.
 */
const UNITLESS_FIELDS = new Set(['largestShiftValue']);

/**
 * 문자열은 자르고 숫자는 접는다. 그 외 타입(객체·배열·함수)은 통째로 버린다 —
 * PerformanceEntry 원본이 섞여 들어오는 걸 막는 마지막 방어선이다.
 */
const pickValue = (
  field: string,
  value: unknown
): string | number | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, MAX_STRING_LENGTH) : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return UNITLESS_FIELDS.has(field)
      ? Math.round(value * 10_000) / 10_000
      : Math.round(value);
  }
  return undefined;
};

export const pickAttribution = (
  metric: RumMetricName,
  attribution: unknown
): Record<string, string | number> | undefined => {
  if (typeof attribution !== 'object' || attribution === null) return undefined;

  const source = attribution as Record<string, unknown>;
  const picked: Record<string, string | number> = {};
  for (const field of ATTRIBUTION_FIELDS[metric]) {
    const value = pickValue(field, source[field]);
    if (value !== undefined) picked[field] = value;
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
};
