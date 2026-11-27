import { OG_SIZE } from '@/shared/lib/og/theme';

/**
 * 대표 이미지가 어디서 잘려 보이는지 — 어드민 미리보기의 테두리 위치를 구한다(순수 함수, 테스트 대상).
 *
 * 값은 모두 원본 그림 대비 비율(0~1). 화면은 이 값을 % 로 써서 테두리를 겹친다.
 *
 * object-fit: cover + object-position: x% y% 의 규칙(CSS 명세):
 *   잘라 낸 상자의 왼쪽 끝 = (원본 폭 - 상자 폭) × x%
 *   → x 가 0% 면 왼쪽 끝에, 100% 면 오른쪽 끝에 붙는다. 세로도 같다.
 */
export type CropFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** "가로% 세로%" → {x, y}(0~100). 못 읽으면 가운데 */
export const parseCoverPosition = (position: string) => {
  const match = /^(\d{1,3})% (\d{1,3})%$/.exec(position);
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  return match
    ? { x: clamp(Number(match[1])), y: clamp(Number(match[2])) }
    : { x: 50, y: 50 };
};

/** 원본(width×height) 안에서 비율 ratio(가로/세로) 상자를 x%·y% 기준으로 cover 자르기 */
export const cropFrame = (
  size: { width: number; height: number },
  ratio: number,
  x: number,
  y: number
): CropFrame => {
  const imageRatio = size.width / size.height;
  // 원본이 더 넓으면 세로를 꽉 채우고 가로를 자른다, 아니면 반대
  const width = imageRatio > ratio ? ratio / imageRatio : 1;
  const height = imageRatio > ratio ? 1 : imageRatio / ratio;
  return {
    left: (1 - width) * (x / 100),
    top: (1 - height) * (y / 100),
    width,
    height,
  };
};

export const coverCropFrames = (
  size: { width: number; height: number },
  position: string
) => {
  const { x, y } = parseCoverPosition(position);
  return {
    /** 목록 정사각형 썸네일 — 고른 위치 */
    square: cropFrame(size, 1, x, y),
    /** 공유 미리보기 1200×630 — share-image 가 가운데 기준으로 자른다 */
    og: cropFrame(size, OG_SIZE.width / OG_SIZE.height, 50, 50),
  };
};
