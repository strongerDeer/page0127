/**
 * 불러온 책등 이미지가 정말 책등 모양인지 — 홈 케미 그림은 아니면 그 칸을 뺀다(ShelfSpine).
 * 내 서재 책장은 YES24 이미지를 그대로 보여 준다(2026-11-20 HJ).
 *
 * 왜 필요한가: YES24 는 가끔 책등 자리(`/SIDE/XL`)에 **앞표지**를 넣어 둔다
 * (2026-11-20, 『걷는 독서』). 회색 대체 그림(420x600)과 달리 크기가 제각각이라
 * 저장할 때 걸러지지 않고, 책장에 넓적한 표지가 혼자 꽂힌다.
 *
 * 실측 책등은 폭÷높이 0.06~0.1(77~122 x 1200)이고 아주 두꺼운 책도 0.2 를 넘기 어렵다.
 * 앞표지는 0.57~0.78 이다. 그 사이 0.3 을 경계로 둔다.
 *
 * naturalWidth/Height 는 CSS 크기가 아니라 원본 픽셀이라 표시 크기와 상관없이 쓸 수 있다.
 */
export const MAX_SPINE_ASPECT = 0.3;

export const isSpineShaped = ({
  naturalWidth,
  naturalHeight,
}: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>): boolean =>
  // 아직 크기를 모르면(0) 판정하지 않는다 — 책등으로 둔다
  naturalHeight <= 0 || naturalWidth / naturalHeight <= MAX_SPINE_ASPECT;
