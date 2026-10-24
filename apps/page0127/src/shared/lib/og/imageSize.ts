/**
 * 이미지 파일 앞부분에서 가로·세로를 읽는다 — 디코딩 없이 헤더만 본다.
 *
 * 왜 필요한가: 스토리 이미지의 책장은 책등 폭으로 단을 나눈다. 책등 이미지는 책마다 비율이
 * 달라서, 추정값으로 나누면 다 들어가는데 빈 둘째 단이 서거나(2026-10-24 운영) 넘쳐 잘린다.
 * satori 도 그릴 때 같은 헤더를 읽지만 그 값을 밖으로 주지 않는다.
 *
 * PNG · JPEG · GIF · WebP. 모르는 형식이면 null — 부르는 쪽이 글자 책등으로 대신한다.
 */
export type ImageSize = { width: number; height: number };

const readPng = (b: Uint8Array, v: DataView): ImageSize | null =>
  // 8바이트 서명 뒤 IHDR 청크의 폭·높이(빅 엔디언)
  b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e
    ? { width: v.getUint32(16), height: v.getUint32(20) }
    : null;

const readGif = (b: Uint8Array, v: DataView): ImageSize | null =>
  b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46
    ? { width: v.getUint16(6, true), height: v.getUint16(8, true) }
    : null;

/** JPEG — SOFn 마커(C0~CF, 단 C4·C8·CC 제외)를 찾을 때까지 세그먼트를 건너뛴다 */
const readJpeg = (b: Uint8Array, v: DataView): ImageSize | null => {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // 채움 바이트(FF FF ...)는 건너뛴다
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return { height: v.getUint16(i + 5), width: v.getUint16(i + 7) };
    }
    i += 2 + v.getUint16(i + 2);
  }
  return null;
};

const readWebp = (b: Uint8Array, v: DataView): ImageSize | null => {
  const tag = (at: number) => String.fromCharCode(...b.subarray(at, at + 4));
  if (b.length < 30 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return null;
  const chunk = tag(12);
  // 손실 압축 — 프레임 헤더의 14비트 폭·높이
  if (chunk === 'VP8 ') {
    return {
      width: v.getUint16(26, true) & 0x3fff,
      height: v.getUint16(28, true) & 0x3fff,
    };
  }
  // 무손실 — 1바이트 서명 뒤 14비트씩 이어 붙은 (폭-1)·(높이-1)
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  // 확장 — 24비트씩 (폭-1)·(높이-1)
  if (chunk === 'VP8X') {
    const u24 = (at: number) => b[at] | (b[at + 1] << 8) | (b[at + 2] << 16);
    return { width: u24(24) + 1, height: u24(27) + 1 };
  }
  return null;
};

export const readImageSize = (buffer: ArrayBuffer): ImageSize | null => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const size =
    readPng(bytes, view) ??
    readJpeg(bytes, view) ??
    readGif(bytes, view) ??
    readWebp(bytes, view);
  return size && size.width > 0 && size.height > 0 ? size : null;
};
