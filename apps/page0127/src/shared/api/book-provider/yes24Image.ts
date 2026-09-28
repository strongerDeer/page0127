/**
 * YES24 이미지 URL 조립과 "이미지 없음" 판정
 *
 * YES24 이미지는 ISBN이 아니라 **상품번호(itemId)** 로 주소가 만들어진다:
 *
 *   https://image.yes24.com/goods/13137546/XL         앞표지  957 x 1200
 *   https://image.yes24.com/goods/13137546/SIDE/XL    책등     108 x 1200
 *   https://image.yes24.com/goods/13137546/BACK/XL    뒷표지  958 x 1200
 *
 * 상품번호는 한 번 받아 두면 영구히 유효하므로, DB에 저장해 두면 YES24 API가
 * 훗날 종료돼도 이미지는 계속 만들 수 있다.
 *
 * ⚠️ **여기가 이번 전환에서 가장 조용히 깨지는 지점이다.**
 * 알라딘은 이미지가 없으면 404를 줬지만, **YES24는 HTTP 200에 420x600 회색
 * 플레이스홀더를 준다.** 존재하지 않는 상품번호도 마찬가지다. 그래서 응답 코드나
 * `img.onload` 로 판정하면 전부 "성공"으로 통과하고, 책장이 회색 네모로 채워진다.
 * 에러가 한 줄도 안 나므로 아무도 모른다. **판정은 크기로만 한다.**
 */

const IMAGE_BASE = 'https://image.yes24.com/goods';

/** XL이 가장 큰 원본. 화면에 쓰는 건 리사이즈한 사본이므로 원본은 가장 큰 걸 받는다 */
export type Yes24ImageSize = 'XL' | 'L' | 'M';

/**
 * "이미지 없음" 플레이스홀더의 지문.
 *
 * 2026-09-28 실측: 없는 상품번호(999999999)도, 책등이 없는 책(101641562)도
 * **바이트까지 똑같은** 420x600 흑백 JPEG를 HTTP 200으로 돌려줬다.
 * (MD5 4bc7c67da39c9d6c9c4f7f3ca73632b5)
 */
export const YES24_PLACEHOLDER_WIDTH = 420;
export const YES24_PLACEHOLDER_HEIGHT = 600;

/**
 * 플레이스홀더의 바이트 길이.
 *
 * 크기만으로 판정하면 안 되는 이유: **XL 원본 크기가 책마다 제각각이다.**
 * 같은 XL이라도 827x1200·791x1200·760x1200 이 있고, 오래된 책은 284x400 까지
 * 내려간다(101641562 실측). 그러니 420x600 짜리 진짜 표지가 있을 수 있다.
 * 바이트 길이까지 같아야 "없는 이미지"로 본다.
 */
export const YES24_PLACEHOLDER_BYTE_LENGTH = 4975;

export const buildYes24CoverUrl = (
  itemId: string,
  size: Yes24ImageSize = 'XL'
): string => `${IMAGE_BASE}/${itemId}/${size}`;

export const buildYes24SpineUrl = (
  itemId: string,
  size: Yes24ImageSize = 'XL'
): string => `${IMAGE_BASE}/${itemId}/SIDE/${size}`;

export const buildYes24BackUrl = (
  itemId: string,
  size: Yes24ImageSize = 'XL'
): string => `${IMAGE_BASE}/${itemId}/BACK/${size}`;

/**
 * 받아 온 이미지가 "이미지 없음" 플레이스홀더인지 판정한다.
 *
 * `byteLength` 를 넘길 수 있으면 넘겨라 — 크기만으로는 420x600 짜리 진짜 표지와
 * 구분되지 않는다. 이미지를 바이트로 들고 있는 백필에서는 항상 넘길 수 있다.
 * 브라우저에서 `img.naturalWidth`/`naturalHeight` 만 아는 경우에는 생략한다
 * (그때는 크기만으로 판정하므로 오탐 여지가 남는다).
 */
export const isYes24PlaceholderImage = (
  width: number,
  height: number,
  byteLength?: number
): boolean => {
  if (
    width !== YES24_PLACEHOLDER_WIDTH ||
    height !== YES24_PLACEHOLDER_HEIGHT
  ) {
    return false;
  }

  return byteLength === undefined
    ? true
    : byteLength === YES24_PLACEHOLDER_BYTE_LENGTH;
};
