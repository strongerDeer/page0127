import { describe, expect, it } from 'vitest';

import { isSpineShaped } from './spineShape';

describe('isSpineShaped — 책등 자리에 앞표지가 든 YES24 이미지 걸러내기', () => {
  it('실측 책등(77~122 x 1200)은 책등이다', () => {
    expect(isSpineShaped({ naturalWidth: 77, naturalHeight: 1200 })).toBe(true);
    expect(isSpineShaped({ naturalWidth: 122, naturalHeight: 1200 })).toBe(
      true
    );
  });
  it('아주 두꺼운 책(0.25)까지는 책등이다', () => {
    expect(isSpineShaped({ naturalWidth: 300, naturalHeight: 1200 })).toBe(
      true
    );
  });
  it('앞표지 비율(827 x 1200)은 책등이 아니다', () => {
    expect(isSpineShaped({ naturalWidth: 827, naturalHeight: 1200 })).toBe(
      false
    );
  });
  it('크기를 아직 모르면 책등으로 둔다', () => {
    expect(isSpineShaped({ naturalWidth: 0, naturalHeight: 0 })).toBe(true);
  });
});
