import { describe, expect, it } from 'vitest';

import { isCompleteWoff } from './render';

/** WOFF 머리만 있는 가짜 파일 — 서명과 "전체 길이" 칸만 채운다 */
const fakeWoff = (byteLength: number, declaredLength = byteLength) => {
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  view.setUint32(0, 0x774f4646); // 'wOFF'
  view.setUint32(8, declaredLength);
  return buffer;
};

describe('isCompleteWoff (공유 카드 폰트가 온전한지)', () => {
  it('머리에 적힌 길이만큼 다 온 WOFF 는 통과', () => {
    expect(isCompleteWoff(fakeWoff(2048))).toBe(true);
  });

  it('덜 받은 파일은 거른다', () => {
    expect(isCompleteWoff(fakeWoff(1024, 2048))).toBe(false);
  });

  it('WOFF 가 아닌 응답(HTML 오류 페이지 등)은 거른다', () => {
    const buffer = fakeWoff(2048);
    new DataView(buffer).setUint32(0, 0x3c21444f); // '<!DO'
    expect(isCompleteWoff(buffer)).toBe(false);
  });

  it('머리보다 짧으면 거른다', () => {
    expect(isCompleteWoff(new ArrayBuffer(10))).toBe(false);
  });
});
