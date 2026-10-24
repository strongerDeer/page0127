import { readImageSize } from './imageSize';

export type LoadedImage = {
  /** data URI — satori 가 같은 이미지를 다시 받지 않게 받은 바이트를 그대로 넘긴다 */
  src: string;
  width: number;
  height: number;
};

/** 한 장에 이보다 오래 걸리면 포기한다 — 스토리 이미지 전체가 한 장 때문에 늦어지지 않게 */
const LOAD_TIMEOUT_MS = 4000;

/**
 * 공유 이미지에 넣을 이미지를 받아 크기를 읽는다. 못 받거나 이미지가 아니면 null.
 * 실패를 던지지 않는다 — 부르는 쪽이 대신할 모양(글자 책등 등)을 정한다.
 */
export const loadImage = async (url: string): Promise<LoadedImage | null> => {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(LOAD_TIMEOUT_MS),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;

    const buffer = await res.arrayBuffer();
    const size = readImageSize(buffer);
    if (!size) return null;

    return {
      ...size,
      src: `data:${type};base64,${Buffer.from(buffer).toString('base64')}`,
    };
  } catch {
    return null;
  }
};
