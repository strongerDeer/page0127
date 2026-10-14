import { describe, expect, it } from 'vitest';

import { tooltipShift } from './tooltipShift';

// 책장(상자) 0~400px, 여백 8px
const box = { left: 0, right: 400 };

describe('tooltipShift', () => {
  it('상자 안에 있으면 그대로(0)', () => {
    expect(tooltipShift({ left: 100, right: 300 }, box)).toBe(0);
  });

  it('왼쪽으로 넘치면 오른쪽으로 민다(여백 포함)', () => {
    expect(tooltipShift({ left: -50, right: 170 }, box)).toBe(58);
  });

  it('오른쪽으로 넘치면 왼쪽으로 민다(여백 포함)', () => {
    expect(tooltipShift({ left: 250, right: 470 }, box)).toBe(-78);
  });

  it('상자보다 넓으면 왼쪽 끝에 맞춘다 — 글자 시작이 보이게', () => {
    expect(tooltipShift({ left: -100, right: 500 }, box)).toBe(108);
  });
});
