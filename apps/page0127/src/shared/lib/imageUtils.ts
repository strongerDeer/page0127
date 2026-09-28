/**
 * 알라딘 이미지 URL 변환 유틸리티
 *
 * 알라딘 OpenAPI 종료(2026-10-30)까지의 폴백 경로에서만 쓴다.
 * 책등 주소 유도는 `book-provider/aladin.ts`, 실재 확인은 `lib/spineImage.ts` 가 맡는다.
 */

/**
 * 알라딘 표지 이미지 URL을 고해상도로 변환
 * @param coverUrl - 알라딘 API에서 받은 기본 이미지 URL
 * @returns 고해상도 이미지 URL (cover500)
 *
 * 알라딘 API Cover=Big 파라미터는 cover200 크기 이미지 반환
 * URL 패턴: https://image.aladin.co.kr/product/12345/67/cover200/1234567890_1.jpg
 * 변환 후: https://image.aladin.co.kr/product/12345/67/cover500/1234567890_1.jpg
 */
export const upgradeImageResolution = (coverUrl: string): string => {
  // cover200을 cover500으로 변경
  return coverUrl.replace('cover200', 'cover500');
};
