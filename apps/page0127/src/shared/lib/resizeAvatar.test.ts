import { describe, expect, it } from 'vitest';

import {
  AVATAR_MAX_EDGE,
  calcResizedSize,
  shouldSkipResize,
} from './resizeAvatar';

/**
 * canvas 로 실제 픽셀을 그리는 부분은 브라우저가 필요해 여기서 확인하지 않는다.
 * 대신 **무엇을 줄이고 무엇을 건드리지 않을지** 정하는 판단부를 고정한다.
 * 잘못되면 조용히 화질이 나빠지거나(과하게 축소), 4MB 원본이 그대로 저장된다.
 */
const makeFile = (type: string, size: number): File => {
  const file = new File(['x'], 'avatar', { type });
  // File.size 는 읽기 전용이라 내용으로 만들 수 없는 크기는 직접 정의한다.
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('calcResizedSize', () => {
  it('긴 변을 512px 에 맞추고 비율을 유지한다', () => {
    expect(calcResizedSize(2048, 1024)).toEqual({ width: 512, height: 256 });
    expect(calcResizedSize(1024, 2048)).toEqual({ width: 256, height: 512 });
  });

  it('원본이 이미 작으면 키우지 않는다', () => {
    // 없는 화질은 생기지 않고 용량만 는다.
    expect(calcResizedSize(200, 120)).toEqual({ width: 200, height: 120 });
  });

  it('정확히 상한이면 그대로 둔다', () => {
    expect(calcResizedSize(AVATAR_MAX_EDGE, AVATAR_MAX_EDGE)).toEqual({
      width: AVATAR_MAX_EDGE,
      height: AVATAR_MAX_EDGE,
    });
  });

  it('극단적인 비율에서도 0px 이 되지 않는다', () => {
    // 4000x3 을 그대로 계산하면 높이가 0.38 → 반올림 0 이 되어 canvas 가 죽는다.
    const { width, height } = calcResizedSize(4000, 3);

    expect(width).toBe(AVATAR_MAX_EDGE);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});

describe('shouldSkipResize', () => {
  it('GIF 는 건드리지 않는다 — 다시 그리면 첫 프레임만 남는다', () => {
    expect(shouldSkipResize(makeFile('image/gif', 2 * 1024 * 1024))).toBe(true);
  });

  it('이미 작은 파일은 다시 인코딩하지 않는다', () => {
    expect(shouldSkipResize(makeFile('image/jpeg', 100 * 1024))).toBe(true);
  });

  it('큰 사진은 줄인다', () => {
    expect(shouldSkipResize(makeFile('image/jpeg', 3 * 1024 * 1024))).toBe(
      false
    );
    expect(shouldSkipResize(makeFile('image/png', 1024 * 1024))).toBe(false);
  });
});
