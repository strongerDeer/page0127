import { describe, expect, it } from 'vitest';

import { shouldShowReadCount } from '../src/components/ReadCountBadge';

/**
 * "1회독은 배지를 달지 않는다"는 제품 규칙을 고정한다.
 *
 * 이 판정이 조용히 바뀌면 서재의 거의 모든 책에 배지가 붙거나(신호가 사라짐),
 * 반대로 재독한 책의 배지가 전부 사라진다. 둘 다 에러 없이 화면만 달라지는
 * 종류라 테스트로 못 박아 둔다.
 */
describe('shouldShowReadCount', () => {
  it('2회독부터 표시한다', () => {
    expect(shouldShowReadCount(2)).toBe(true);
    expect(shouldShowReadCount(99)).toBe(true);
  });

  it('0·1회독은 표시하지 않는다 — 대부분의 책이 여기 해당한다', () => {
    expect(shouldShowReadCount(1)).toBe(false);
    expect(shouldShowReadCount(0)).toBe(false);
  });

  it('음수는 표시하지 않는다', () => {
    // DB 제약이 막고 있지만, 판정 함수가 스스로 방어하지 않으면
    // 값이 새는 경로가 생겼을 때 "-3회독" 배지가 화면에 뜬다.
    expect(shouldShowReadCount(-3)).toBe(false);
  });

  it('NaN 은 표시하지 않는다 — 비교 연산만으로는 부족하다', () => {
    // Number.isFinite 없이 `count > 1` 만 쓰면 NaN 은 false 라 우연히
    // 통과하지만, Infinity 는 true 가 되어 "Infinity회독"이 렌더된다.
    expect(shouldShowReadCount(Number.NaN)).toBe(false);
    expect(shouldShowReadCount(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
