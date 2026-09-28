import { isYes24PlaceholderImage } from '@/shared/api/book-provider';

/**
 * 책등 이미지 주소를 브라우저에서 확인한다.
 *
 * 왜 따로 확인하는가: **YES24는 책등이 없어도 404가 아니라 200에 회색
 * 플레이스홀더를 준다.** 그래서 `img.onload` 는 항상 성공한다 — 그대로 저장하면
 * 책장이 회색 네모로 채워지고, 에러가 한 줄도 안 나므로 아무도 모른다.
 * 로드된 뒤 **크기를 보고** 판정해야 한다.
 *
 * 브라우저에서는 바이트 길이를 알 수 없어 크기만으로 판정한다(`isYes24PlaceholderImage`
 * 의 두 번째 방어선인 바이트 검사는 백필 쪽에서 쓴다). 420x600 짜리 진짜 표지를
 * 가진 책이 있다면 그 책의 책등만 누락되는데, 잘못 채워 회색 네모를 남기는 것보다
 * 비워 두는 편이 낫다.
 *
 * 학습 포인트:
 * - `naturalWidth`/`naturalHeight` 는 CSS 크기가 아니라 **원본 픽셀 크기**다
 */

const LOAD_TIMEOUT_MS = 3000;

export const resolveSpineImageUrl = async (
  candidateUrl: string | null,
  timeout: number = LOAD_TIMEOUT_MS
): Promise<string | null> => {
  if (!candidateUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const timeoutId = setTimeout(() => resolve(null), timeout);

    img.onload = () => {
      clearTimeout(timeoutId);

      // 여기가 핵심 — 로드에 성공했다고 이미지가 있는 게 아니다
      if (isYes24PlaceholderImage(img.naturalWidth, img.naturalHeight)) {
        resolve(null);
        return;
      }

      resolve(candidateUrl);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(null);
    };

    img.src = candidateUrl;
  });
};
