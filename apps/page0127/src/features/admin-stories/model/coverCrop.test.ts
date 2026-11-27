import { describe, expect, it } from 'vitest';

import { coverCropFrames, cropFrame, parseCoverPosition } from './coverCrop';

describe('parseCoverPosition', () => {
  it('"가로% 세로%"를 읽고, 못 읽으면 가운데', () => {
    expect(parseCoverPosition('20% 100%')).toEqual({ x: 20, y: 100 });
    expect(parseCoverPosition('left top')).toEqual({ x: 50, y: 50 });
  });
});

describe('cropFrame — object-fit: cover 와 같은 자리', () => {
  it('가로로 긴 그림의 정사각형은 세로를 꽉 채우고, 0% 면 왼쪽·100% 면 오른쪽 끝', () => {
    const size = { width: 1200, height: 600 };
    expect(cropFrame(size, 1, 0, 50)).toEqual({
      left: 0,
      top: 0,
      width: 0.5,
      height: 1,
    });
    expect(cropFrame(size, 1, 100, 50)).toEqual({
      left: 0.5,
      top: 0,
      width: 0.5,
      height: 1,
    });
    expect(cropFrame(size, 1, 50, 50).left).toBe(0.25);
  });

  it('세로로 긴 그림의 정사각형은 가로를 꽉 채우고 세로 위치를 따른다', () => {
    const frame = cropFrame({ width: 1000, height: 2000 }, 1, 50, 0);
    expect(frame).toEqual({ left: 0, top: 0, width: 1, height: 0.5 });
  });

  it('1200×630 그림은 공유 미리보기 상자가 그림 전체', () => {
    const { og } = coverCropFrames({ width: 1200, height: 630 }, '50% 50%');
    expect(og.left).toBeCloseTo(0);
    expect(og.top).toBeCloseTo(0);
    expect(og.width).toBeCloseTo(1);
    expect(og.height).toBeCloseTo(1);
  });
});
