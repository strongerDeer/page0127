import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkYes24SpineOnServer } from './checkYes24SpineOnServer';

/** SOI → SOF0(가로·세로) 만 있는 최소 JPEG 헤더를 원하는 길이로 늘린다 */
const jpeg = (width: number, height: number, byteLength: number) => {
  const bytes = new Uint8Array(byteLength);
  bytes.set([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
  ]);
  return bytes;
};

const mockFetch = (response: Response | Error) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (response instanceof Error) throw response;
    return response;
  });

afterEach(() => vi.restoreAllMocks());

describe('checkYes24SpineOnServer', () => {
  it('진짜 책등이면 real', async () => {
    mockFetch(new Response(jpeg(122, 1200, 30_000)));
    expect(await checkYes24SpineOnServer('https://x')).toBe('real');
  });

  it('회색 대체 이미지(420x600, 4975바이트)면 none', async () => {
    mockFetch(new Response(jpeg(420, 600, 4975)));
    expect(await checkYes24SpineOnServer('https://x')).toBe('none');
  });

  it('420x600 이어도 바이트가 다르면 진짜로 본다', async () => {
    mockFetch(new Response(jpeg(420, 600, 20_000)));
    expect(await checkYes24SpineOnServer('https://x')).toBe('real');
  });

  it('200 이 아니면 error — 서버가 막힌 것', async () => {
    mockFetch(new Response('', { status: 403 }));
    expect(await checkYes24SpineOnServer('https://x')).toBe('error');
  });

  it('네트워크 오류면 error', async () => {
    mockFetch(new Error('network'));
    expect(await checkYes24SpineOnServer('https://x')).toBe('error');
  });
});
