import { describe, expect, it } from 'vitest';

import { extractEventText, isNoiseEvent } from './sentryNoiseFilter';

describe('extractEventText', () => {
  it('콘솔 캡처 이벤트는 message에서 뽑는다', () => {
    expect(extractEventText({ message: '무언가 실패' })).toBe('무언가 실패');
  });

  it('예외 이벤트는 exception에서 뽑는다', () => {
    expect(
      extractEventText({ exception: { values: [{ value: 'TypeError: x' }] } })
    ).toBe('TypeError: x');
  });

  it('둘 다 없으면 빈 문자열', () => {
    expect(extractEventText({})).toBe('');
    expect(extractEventText({ exception: { values: [] } })).toBe('');
  });
});

describe('isNoiseEvent', () => {
  it('Node 실험 기능 경고는 걸러낸다', () => {
    expect(
      isNoiseEvent(
        '(node:4) ExperimentalWarning: vm.USE_MAIN_CONTEXT_DEFAULT_LOADER is an experimental feature'
      )
    ).toBe(true);
  });

  it('일반 오류는 통과시킨다 — 필터가 진짜 오류를 삼키면 안 된다', () => {
    expect(isNoiseEvent('취향 분석 실패: 401 Incorrect API key')).toBe(false);
    expect(isNoiseEvent('공개 책 기록 조회 실패')).toBe(false);
    expect(
      isNoiseEvent('[health] 마이그레이션 미적용: 코드는 20260729000002 를 기대한다')
    ).toBe(false);
  });

  it('빈 문자열은 노이즈가 아니다 — 내용을 모르면 올려서 보게 한다', () => {
    expect(isNoiseEvent('')).toBe(false);
  });
});
