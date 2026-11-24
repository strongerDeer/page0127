import { isTopRated } from '@/entities/book';
import { shelfSpineWidthPx } from '@/entities/book/model/spineWidth';

import type { Book } from '@/entities/book';

/**
 * 책장 가상화를 위한 "단 나누기".
 *
 * 왜 필요한가: 가상화는 "몇 번째 줄이 화면에 보이나"로 그릴 것을 고른다. 그런데 책장은
 * `flex-wrap` 이라 **어느 책이 몇 번째 단에 놓일지 브라우저가 그려 봐야 안다.**
 * 그려 보지 않고 단을 알려면, 책마다 폭을 미리 어림해서 우리가 직접 단을 나눠야 한다.
 *
 * 다행히 단 높이는 CSS 에 고정돼 있다(li 249 + 간격 31 = 280px, 조밀 선반 246px).
 * 그래서 "단 나누기"만 하면 단 하나 = 가상화의 한 줄로 그대로 쓸 수 있다.
 */

/** 한 단의 반복 높이(px) — PublicBookShelf.module.css 의 background-size 와 같다 */
export const SHELF_ROW_HEIGHT = { normal: 280, compact: 246 } as const;

/** 단과 단 사이 간격(px) — 마지막 단 아래에는 없다 */
export const SHELF_ROW_GAP = { normal: 31, compact: 28 } as const;

/** 책 사이 가로 간격(px) — 조밀 선반만 2px */
const ITEM_GAP = { normal: 0, compact: 2 } as const;

/** 누르는 칸 최소 폭(WCAG 2.5.8) — CSS 의 `.item { min-width: 24px }` */
const MIN_ITEM_PX = 24;

/** `.item { padding: 0 1px }` + 책 테두리 1px 양쪽 — 실측(2026-11-20) 글자 책등 22px → 칸 26px */
const ITEM_PADDING_PX = 4;

/**
 * 책등 이미지는 이미지를 받아야 폭을 안다(높이 240px 에서 15~24px 로 그려진다, 2026-10-31 실측).
 * 미리 알 수 없으니 넓은 쪽으로 어림한다 — 좁게 잡으면 한 단에 너무 많이 넣어 넘친다.
 */
const IMAGE_SPINE_PX = 24;

/** 표지로 세우는 책(5점·인생책)의 폭 — CSS `.noImage.cover` 와 같다 */
const COVER_PX = { normal: 170, compact: 149 } as const;

/** 북엔드가 첫 권 앞에 더하는 폭 — CSS `.bookend` 폭 64 + 오른쪽 6 + 왼쪽 12 */
export const BOOKEND_PX = 82;

/** 끝칸(도서 추가) 어림 폭 */
export const TRAILING_SLOT_PX = 60;

type Size = 'normal' | 'compact';

/** 책 한 권이 선반에서 차지할 폭을 그리기 전에 어림한다 */
export const estimateShelfItemWidth = (
  book: Pick<
    Book,
    'rating' | 'is_life_book' | 'spine_image' | 'thickness_mm' | 'is_public'
  >,
  size: Size = 'normal'
): number => {
  const isCover = isTopRated(book.rating, book.is_life_book);
  if (isCover) return COVER_PX[size] + ITEM_PADDING_PX;

  // 이미지 책등만 폭을 모른다. 북커버(비공개)·글자 책등은 두께로 폭이 정해진다
  const hasSpineImage = Boolean(book.spine_image) && book.is_public !== false;
  const body = hasSpineImage
    ? IMAGE_SPINE_PX
    : shelfSpineWidthPx(book.thickness_mm);

  return Math.max(MIN_ITEM_PX, body + ITEM_PADDING_PX);
};

/**
 * 어림 폭으로 책들을 단에 나눈다 (앞에서부터 채우다 넘치면 다음 단).
 *
 * 쓸 수 있는 폭을 실제보다 조금 좁게 잡는다(`safety`). 어림이 틀려 실제 책이 더 넓으면
 * 한 단이 넘쳐 줄이 깨지는데, 좁게 잡으면 단 끝에 여백이 조금 남을 뿐이다.
 * 가운데 정렬이라 그 여백은 양쪽으로 나뉘어 거의 눈에 띄지 않는다.
 *
 * @returns 단마다 들어갈 항목의 순번 목록
 */
export const packShelfRows = (
  widths: number[],
  containerWidth: number,
  size: Size = 'normal',
  safety = 0.94
): number[][] => {
  const usable = Math.max(MIN_ITEM_PX, containerWidth * safety);
  const gap = ITEM_GAP[size];
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;

  widths.forEach((width, index) => {
    const next = row.length === 0 ? width : used + gap + width;
    if (row.length > 0 && next > usable) {
      rows.push(row);
      row = [index];
      used = width;
      return;
    }
    row.push(index);
    used = next;
  });

  if (row.length > 0) rows.push(row);
  return rows;
};
