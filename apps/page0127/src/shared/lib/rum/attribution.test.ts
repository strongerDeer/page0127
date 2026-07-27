import { describe, expect, it } from 'vitest';

import { pickAttribution } from './attribution';

describe('pickAttribution', () => {
  // attribution 원본에는 PerformanceEntry가 통째로 들어 있어 직렬화하면 수 KB다.
  // 그대로 보내면 서버의 2KB 상한에 걸려 **전부** 버려진다.
  it('PerformanceEntry 같은 무거운 객체를 걷어낸다', () => {
    const picked = pickAttribution('lcp', {
      target: 'main>img.cover',
      timeToFirstByte: 928.4,
      lcpEntry: { name: 'x', entryType: 'largest-contentful-paint', size: 9000 },
      navigationEntry: { serverTiming: [{ name: 'db', duration: 12 }] },
    });
    expect(picked).toEqual({ target: 'main>img.cover', timeToFirstByte: 928 });
  });

  it('지표마다 다른 필드를 고른다', () => {
    expect(
      pickAttribution('inp', {
        interactionTarget: 'button#like',
        interactionType: 'pointer',
        inputDelay: 12.7,
        processingDuration: 40.2,
        presentationDelay: 8.9,
        timeToFirstByte: 900, // INP 필드가 아니다 → 버린다
      })
    ).toEqual({
      interactionTarget: 'button#like',
      interactionType: 'pointer',
      inputDelay: 13,
      processingDuration: 40,
      presentationDelay: 9,
    });

    expect(
      pickAttribution('ttfb', {
        waitingDuration: 300.4,
        dnsDuration: 0,
        connectionDuration: 50.6,
        requestDuration: 120.1,
        cacheDuration: 0,
      })
    ).toEqual({
      waitingDuration: 300,
      dnsDuration: 0,
      connectionDuration: 51,
      requestDuration: 120,
      cacheDuration: 0,
    });
  });

  // 정수로 접으면 0.0234가 통째로 0이 된다 — CLS는 스케일이 다른 지표다.
  it('CLS의 작은 소수를 0으로 뭉개지 않는다', () => {
    const picked = pickAttribution('cls', {
      largestShiftTarget: 'div.banner',
      largestShiftValue: 0.02345678,
      largestShiftTime: 1234.56,
      loadState: 'complete',
    });
    expect(picked).toEqual({
      largestShiftTarget: 'div.banner',
      largestShiftValue: 0.0235,
      largestShiftTime: 1235,
      loadState: 'complete',
    });
  });

  it('셀렉터가 너무 길면 자른다', () => {
    const picked = pickAttribution('lcp', { target: 'a'.repeat(500) });
    expect((picked?.target as string).length).toBe(200);
  });

  it('쓸 값이 하나도 없으면 undefined다 (빈 객체가 아니다)', () => {
    expect(pickAttribution('lcp', {})).toBeUndefined();
    expect(pickAttribution('lcp', undefined)).toBeUndefined();
    expect(pickAttribution('lcp', null)).toBeUndefined();
    expect(pickAttribution('lcp', { lcpEntry: {} })).toBeUndefined();
  });

  it('NaN·Infinity는 버린다', () => {
    expect(
      pickAttribution('lcp', {
        timeToFirstByte: Number.NaN,
        resourceLoadDelay: Number.POSITIVE_INFINITY,
        elementRenderDelay: 100,
      })
    ).toEqual({ elementRenderDelay: 100 });
  });
});
