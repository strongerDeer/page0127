/**
 * JPEG 바이트에서 가로·세로 픽셀 크기를 읽는다. JPEG 가 아니거나 크기를 못 찾으면 null.
 *
 * 왜 직접 읽는가: 서버에서 YES24 책등이 "회색 대체 이미지(420x600)"인지 보려면 크기가 필요한데,
 * 그걸 위해 sharp 를 서버 함수에 다시 넣으면 배포 크기가 커진다(Vercel 한도, PR #322).
 * JPEG 크기는 SOF(Start Of Frame) 마커 안에 몇 바이트로 들어 있어서 헤더만 훑으면 된다.
 *
 * 구조: FFD8(시작) 뒤로 [FF, 마커, 길이(2바이트, 길이 자신 포함), 내용…] 조각이 이어진다.
 * SOF0~SOF15(C0~CF, 단 C4·C8·CC 는 다른 용도) 조각의 내용은 [정밀도 1, 세로 2, 가로 2] 로 시작한다.
 */
export const readJpegSize = (
  bytes: Uint8Array
): { width: number; height: number } | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // 채움 바이트(FF FF …)는 건너뛴다
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) return null;

    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > bytes.length) return null;
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
};
