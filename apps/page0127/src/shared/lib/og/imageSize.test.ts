import { describe, expect, it } from 'vitest';

import { readImageSize } from './imageSize';
import { FIXTURES } from './imageSize.fixtures';

const buffer = (base64: string): ArrayBuffer => {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
};

describe('readImageSize', () => {
  it.each([
    ['PNG', FIXTURES.PNG],
    ['JPEG', FIXTURES.JPEG],
    ['GIF', FIXTURES.GIF],
    ['WebP (손실)', FIXTURES.WEBP],
    ['WebP (무손실)', FIXTURES.WEBP_LL],
  ])('%s 헤더에서 폭·높이를 읽는다', (_, data) => {
    expect(readImageSize(buffer(data))).toEqual({ width: 37, height: 600 });
  });

  it('진행형 JPEG(SOF2)도 읽는다', () => {
    expect(readImageSize(buffer(FIXTURES.JPEG_PROG))).toEqual({
      width: 41,
      height: 610,
    });
  });

  it('모르는 형식·잘린 파일이면 null', () => {
    expect(readImageSize(new TextEncoder().encode('<html>').buffer)).toBeNull();
    expect(readImageSize(new ArrayBuffer(0))).toBeNull();
  });
});
