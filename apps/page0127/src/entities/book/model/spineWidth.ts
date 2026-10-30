/**
 * 책등 폭을 실물 두께에서 계산한다.
 *
 * 왜 필요한가: 책장 CSS 가 `width: auto; height: 240px` 라서 **책등 폭이 이미지
 * 자체 비율로** 정해진다. 그런데 서점 책등 이미지의 폭은 실제 두께와 상관이 없다 —
 * 2026-09-29 실측에서 피로사회(20mm)는 6px, 저소비 생활(17mm)은 19px 로 그려졌다.
 * **더 얇은 책이 세 배 두껍게 보인다.** 책장의 실루엣이 거짓말을 하고 있었다.
 *
 * 그래서 폭을 이미지가 아니라 `thickness_mm` 에서 만든다.
 *
 * 학습 포인트:
 * - 물리적으로 정확한 비례(240px 높이 ≒ 210mm 책 → 1.14px/mm)를 그대로 쓰면
 *   9mm 책이 10px 가 된다. 누르기도 보기도 어렵다. **읽을 수 있는 범위로 압축**하되
 *   순서와 상대적 차이는 유지하는 것이 목적이다
 *
 * ⚠️ **책등 이미지가 없는 책에만** 쓴다. 이 폭은 스캔의 자연 렌더 폭(12~27px)보다
 * 넓어서, 이미지에 걸면 `cover` 는 위아래가 잘리고(평균 55% 손실) `fill` 은 글자가
 * 옆으로 늘어난다(평균 2.27배). 둘 다 겪고 되돌렸다(2026-09-30) — 이미지 책등은
 * 높이만 고정하고 폭은 원본 비율에 맡긴다.
 */

/** 이 아래로는 다 같은 폭으로 본다. 운영 최소가 9mm 였다 */
const MIN_MM = 10;

/** 이 위로는 다 같은 폭. 운영 최대가 40mm 라 여유를 뒀다(전집·양장 대비) */
const MAX_MM = 45;

/** 손가락으로 누를 수 있는 최소 폭 */
const MIN_PX = 32;

/** 너무 넓으면 한 줄에 몇 권 못 꽂는다 */
const MAX_PX = 64;

/** 두께를 모르는 책. 기존 고정값과 같아 화면이 갑자기 바뀌지 않는다 */
export const DEFAULT_SPINE_WIDTH = 50;

/**
 * @example
 * spineWidthPx(10)   // 32  (가장 얇은 책)
 * spineWidthPx(20)   // 41  (중앙값)
 * spineWidthPx(30)   // 50  (기존 고정값과 같다)
 * spineWidthPx(45)   // 64  (가장 두꺼운 책)
 * spineWidthPx(null) // 50  (모르면 기존대로)
 */
export const spineWidthPx = (
  thicknessMm: number | null | undefined
): number => {
  if (typeof thicknessMm !== 'number' || thicknessMm <= 0) {
    return DEFAULT_SPINE_WIDTH;
  }

  const clamped = Math.min(Math.max(thicknessMm, MIN_MM), MAX_MM);
  const ratio = (clamped - MIN_MM) / (MAX_MM - MIN_MM);

  return Math.round(MIN_PX + ratio * (MAX_PX - MIN_PX));
};

/** 서재 책장(웹)의 글자 책등 폭 범위 — 아래 shelfSpineWidthPx 참고 */
const SHELF_MIN_PX = 18;
const SHELF_MAX_PX = 36;

/**
 * 서재 책장(웹)에서 책등 이미지가 없는 책의 폭.
 *
 * 왜 따로 두는가: 진짜 책등 이미지는 높이 240px 에서 15~24px 로 그려진다
 * (2026-10-31 실측: 77·96·106·121 x 1200). spineWidthPx 의 32~64px 는 그 두세 배라
 * 이미지 없는 책만 혼자 두꺼워 보였다(HJ). 웹 책장은 제목을 세로 한 줄로 쓰므로
 * 이미지 책등과 같은 범위로 줄인다.
 *
 * 공유 이미지(StoryCard)는 굵은 큰 글자를 책등에 쌓아 그려서 spineWidthPx 폭이 필요하다
 * — 그래서 그쪽은 그대로 둔다.
 *
 * @example
 * shelfSpineWidthPx(10)   // 18
 * shelfSpineWidthPx(20)   // 23  (중앙값)
 * shelfSpineWidthPx(45)   // 36
 * shelfSpineWidthPx(null) // 28  (모르면 30mm 책과 같다)
 */
export const shelfSpineWidthPx = (
  thicknessMm: number | null | undefined
): number => {
  const ratio = (spineWidthPx(thicknessMm) - MIN_PX) / (MAX_PX - MIN_PX);
  return Math.round(SHELF_MIN_PX + ratio * (SHELF_MAX_PX - SHELF_MIN_PX));
};
