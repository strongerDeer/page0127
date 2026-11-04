import { readJpegSize } from '@/shared/lib/jpegSize';

import { isYes24PlaceholderImage } from './yes24Image';

/** 서버에서 YES24 책등 한 장을 받을 때의 한도. 서버 ↔ YES24 는 보통 0.1~0.3초다 */
const SERVER_FETCH_TIMEOUT_MS = 8000;

/**
 * 'real' 진짜 책등 · 'none' YES24 에도 책등이 없음(회색 대체 이미지) · 'error' 확인 자체를 못 함
 */
export type SpineCheck = 'real' | 'none' | 'error';

/**
 * YES24 책등 주소를 **서버에서** 받아 진짜 책등인지 본다.
 *
 * 브라우저 확인(resolveSpineImageUrl)과 다른 점: 바이트를 들고 있으므로 크기 + 바이트 길이로
 * 회색 대체 이미지를 판정한다(오탐 없음). JPEG 크기는 sharp 없이 헤더에서 읽는다(jpegSize.ts).
 *
 * YES24 는 책등이 없어도 200 을 준다 → 200 이 아니거나 JPEG 로 못 읽으면 서버가 막힌 것으로
 * 보고 'error' — 부르는 쪽이 브라우저 확인 등 다른 길로 넘길 수 있게 한다.
 */
export const checkYes24SpineOnServer = async (
  url: string,
  timeout: number = SERVER_FETCH_TIMEOUT_MS
): Promise<SpineCheck> => {
  let bytes: Uint8Array;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
    });
    if (!res.ok) return 'error';
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return 'error';
  }

  const size = readJpegSize(bytes);
  if (!size) return 'error';
  return isYes24PlaceholderImage(size.width, size.height, bytes.length)
    ? 'none'
    : 'real';
};
