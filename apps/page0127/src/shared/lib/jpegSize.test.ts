import { describe, expect, it } from 'vitest';

import { readJpegSize } from './jpegSize';

/** SOI → APP0(빈 내용) → SOF0(가로·세로) 만 있는 최소 JPEG 헤더 */
const jpegHeader = (width: number, height: number, sof = 0xc0) =>
  new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x04,
    0x00,
    0x00,
    0xff,
    sof,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
  ]);

describe('readJpegSize', () => {
  it('SOF0 에서 가로·세로를 읽는다', () => {
    expect(readJpegSize(jpegHeader(108, 1200))).toEqual({
      width: 108,
      height: 1200,
    });
  });

  it('프로그레시브(SOF2)도 읽는다', () => {
    expect(readJpegSize(jpegHeader(420, 600, 0xc2))).toEqual({
      width: 420,
      height: 600,
    });
  });

  it('JPEG 가 아니면 null', () => {
    expect(readJpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('SOF 전에 끝나면 null', () => {
    expect(readJpegSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
  });
});
