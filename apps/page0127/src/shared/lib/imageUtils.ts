/**
 * 알라딘 이미지 URL 변환 유틸리티
 *
 * 학습 포인트:
 * - 알라딘 API의 기본 이미지 URL을 고해상도로 변환
 * - 브라우저 Image 객체를 사용한 이미지 유효성 검증
 * - Promise를 활용한 비동기 이미지 검증
 */

/**
 * 이미지 URL이 유효한지 검증
 * @param url - 검증할 이미지 URL
 * @param timeout - 타임아웃 시간 (밀리초)
 * @returns Promise<boolean> - 이미지 로드 성공 여부
 */
const validateImageUrl = async (
  url: string,
  timeout: number = 3000
): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => resolve(false), timeout);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    img.src = url;
  });
};

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

/**
 * 알라딘 책등(spine) 이미지 URL 검증 및 반환
 * @param coverUrl - 알라딘 API에서 받은 기본 이미지 URL
 * @param isbn - 도서 ISBN
 * @returns Promise<string> - 유효한 spine 이미지 URL 또는 fallback 이미지
 *
 * 알라딘 spineflip 이미지는 두 가지 패턴이 존재:
 * 1. https://image.aladin.co.kr/product/12345/67/spineflip1234567890_d.jpg
 * 2. https://image.aladin.co.kr/product/12345/67/spineflip/1234567890_d.jpg
 */
export const validateSpineImageUrl = async (
  coverUrl: string,
  isbn: string
): Promise<string> => {
  // cover200을 기준으로 URL 분리
  const imgArr = coverUrl.split('cover200');

  if (imgArr.length < 2) {
    return '/images/no-book.jpg';
  }

  // 파일명에서 ISBN 부분 추출 (확장자 제거)
  const fileName = imgArr[1].split('_')[0];

  // 두 가지 가능한 spineflip URL 생성
  const spineflipUrl1 = `${imgArr[0]}spineflip${fileName}_d.jpg`;
  const spineflipUrl2 = `${imgArr[0]}spineflip/${isbn}_d.jpg`;

  // 두 패턴을 동시에 검증 — 순차 실행 시 최대 6초(3초 x 2)까지 걸리던 것을 최대 3초로 줄인다
  const [isValid1, isValid2] = await Promise.all([
    validateImageUrl(spineflipUrl1),
    validateImageUrl(spineflipUrl2),
  ]);

  if (isValid1) return spineflipUrl1;
  if (isValid2) return spineflipUrl2;

  // 둘 다 실패하면 fallback 이미지 반환
  return '/images/no-book.jpg';
};
