import { afterEach, describe, expect, it, vi } from 'vitest';

import { FIXTURES } from './imageSize.fixtures';
import { loadImage } from './loadImage';

const respond = (body: BodyInit | null, init: ResponseInit) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, init));

afterEach(() => vi.restoreAllMocks());

describe('loadImage', () => {
  it('받은 이미지의 크기와 data URI 를 준다', async () => {
    respond(Buffer.from(FIXTURES.PNG, 'base64'), {
      headers: { 'content-type': 'image/png' },
    });
    const image = await loadImage('https://img/spine');
    expect(image).toMatchObject({ width: 37, height: 600 });
    expect(image?.src.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('실패 응답·이미지가 아닌 응답·네트워크 오류는 null — 던지지 않는다', async () => {
    respond(null, { status: 404 });
    expect(await loadImage('https://img/a')).toBeNull();

    respond('<html>', { headers: { 'content-type': 'text/html' } });
    expect(await loadImage('https://img/b')).toBeNull();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'));
    expect(await loadImage('https://img/c')).toBeNull();
  });
});
