/** 스토리 책장에 세울 한 권 (어떤 책을 어떤 모양으로 세울지는 widgets/public-library/model/storyShelf) */
export type StoryShelfItem =
  /** 인생책·5점 — 표지를 앞으로(2:3). 표지가 없으면 제목 판 */
  | { kind: 'cover'; key: string; title: string; src: string | null }
  /**
   * 책등 이미지. ratio(폭÷높이)는 이미지를 받아 헤더에서 읽은 값 — 받기 전엔 null.
   * fallbackWidth 는 받지 못했을 때 글자 책등으로 바꿀 폭(서재 책장 기준 240px 높이)
   */
  | {
      kind: 'spine';
      key: string;
      title: string;
      src: string;
      ratio: number | null;
      fallbackWidth: number;
    }
  /** 책등 이미지가 없는 책 — width 는 서재 책장 기준(240px 높이)의 폭 */
  | { kind: 'plain'; key: string; title: string; width: number };

export type ShelfLayout = {
  /** 1~2단. 각 단은 가운데 정렬해 세운다 */
  rows: StoryShelfItem[][];
  bookHeight: number;
};

/** 서재 책장은 240px 높이 기준으로 책등 폭을 만든다(spineWidth.ts) */
const SHELF_BASE_HEIGHT = 240;
/**
 * 비율을 모르는 책등의 폭÷높이 추정 — 실측(spineWidth.ts)은 240px 높이에서 12~27px.
 * 스토리 라우트는 책등을 미리 받아 실제 비율을 채우므로, 이 값은 받기 전 계산에만 쓰인다.
 */
const SPINE_RATIO_ESTIMATE = 0.075;

export const SHELF_BOOK_GAP = 3;
/** 한 단으로 선반을 채웠을 때 이보다 낮으면 두 단 — 더 낮으면 책등이 실처럼 보인다 */
const MIN_ONE_ROW = 170;
/** 책이 적어도 이보다 높이지 않는다 — 표지 한 장이 화면을 덮는다 */
const MAX_ONE_ROW = 380;
/** 두 단일 때 한 단의 최대 높이 — 두 단과 숫자가 아래 흰 면(경계 고정, ≈700px)에 함께 들어가는 높이 */
const MAX_TWO_ROW = 190;

/** 높이 1 일 때의 폭 */
const unitWidth = (item: StoryShelfItem): number =>
  item.kind === 'cover'
    ? 2 / 3
    : item.kind === 'spine'
      ? (item.ratio ?? SPINE_RATIO_ESTIMATE)
      : item.width / SHELF_BASE_HEIGHT;

/** 높이가 정해졌을 때 한 권의 폭 — 버림이다. 반올림하면 서른 권이 모여 선반을 몇 px 넘친다 */
export const bookWidth = (item: StoryShelfItem, height: number): number =>
  Math.max(1, Math.floor(unitWidth(item) * height));

const sumUnits = (items: StoryShelfItem[]) =>
  items.reduce((sum, item) => sum + unitWidth(item), 0);

/** 이 책들로 한 단을 꽉 채우는 높이 */
const fillHeight = (items: StoryShelfItem[], width: number) => {
  const units = sumUnits(items);
  const gaps = SHELF_BOOK_GAP * Math.max(items.length - 1, 0);
  return units > 0 ? (width - gaps) / units : Infinity;
};

/**
 * 책장 모양 — 최대 2단, 둘째 단이 안 찰 거면 1단.
 *
 * 1. 한 단으로 선반 폭을 채우는 높이가 MIN_ONE_ROW 이상이면 1단 (책이 적으면 MAX_ONE_ROW 에서 멈추고 가운데에 선다)
 * 2. 아니면 2단 — 두 단의 실제 폭(책 + 틈)이 가장 비슷해지는 곳에서 나누고, 넓은 쪽이 선반에 맞는 높이로 세운다
 *    (한 단이 꽉 차고 둘째 단에 몇 권만 남는 모양을 피한다)
 */
export const toShelfLayout = (
  items: StoryShelfItem[],
  width: number
): ShelfLayout => {
  const oneRow = fillHeight(items, width);
  if (oneRow >= MIN_ONE_ROW || items.length < 2) {
    return {
      rows: [items],
      bookHeight: Math.floor(Math.min(MAX_ONE_ROW, oneRow)),
    };
  }

  // 두 단의 실제 폭(책 + 틈)이 가장 비슷해지는 곳에서 나눈다. 책 폭만 보면 얇은 책등이 몰린 단이
  // 틈(3px × 권수)만큼 더 넓어져 한쪽이 기운다
  const widthAt = (row: StoryShelfItem[]) =>
    sumUnits(row) * MAX_TWO_ROW + SHELF_BOOK_GAP * Math.max(row.length - 1, 0);
  let split = 1;
  let narrowest = Infinity;
  for (let i = 1; i < items.length; i += 1) {
    const widest = Math.max(
      widthAt(items.slice(0, i)),
      widthAt(items.slice(i))
    );
    if (widest < narrowest) {
      narrowest = widest;
      split = i;
    }
  }

  const rows = [items.slice(0, split), items.slice(split)];
  const height = Math.min(
    MAX_TWO_ROW,
    ...rows.map((row) => fillHeight(row, width))
  );
  return { rows, bookHeight: Math.floor(height) };
};
