import type { TypingPictureKey } from '@/entities/typing';

/**
 * 필사 쪽 아래에 보여 주는 도트 그림 — page0127.이 직접 그렸다.
 * 원작 삽화를 따라 그리지 않는다(원작 그림·캐릭터는 재단이 상표로 관리). 칸(rect)만으로 단순하게.
 */
type Rect = [x: number, y: number, w: number, h: number, color: string];

const BROWN = '#7a5a35';
const HAT: Rect[] = [
  [18, 4, 10, 1, BROWN],
  [16, 5, 14, 1, BROWN],
  [15, 6, 17, 1, BROWN],
  [14, 7, 19, 2, BROWN],
  [12, 9, 23, 2, BROWN],
  [9, 11, 29, 2, BROWN],
  [5, 13, 38, 2, BROWN],
  [2, 15, 44, 1, BROWN],
  [18, 5, 4, 1, '#a07b4f'],
];
const SHEEP_BODY = (wool: string, face: string): Rect[] => [
  [9, 5, 13, 8, wool],
  [8, 6, 15, 6, wool],
  [21, 6, 5, 4, face],
  [23, 7, 1, 1, '#ffffff'],
  [10, 13, 2, 4, face],
  [18, 13, 2, 4, face],
];

const PICTURES: Record<
  TypingPictureKey,
  { viewBox: string; rects: Rect[] | null; caption: string }
> = {
  hat: { viewBox: '0 0 48 18', rects: HAT, caption: '그림 1호' },
  boa: {
    viewBox: '0 0 48 18',
    rects: [
      ...HAT,
      [16, 7, 15, 6, '#a9b1bf'],
      [13, 10, 4, 3, '#a9b1bf'],
      [30, 9, 4, 2, '#a9b1bf'],
      [18, 12, 2, 2, '#8b93a3'],
      [26, 12, 2, 2, '#8b93a3'],
      [19, 8, 1, 1, '#2b2418'],
    ],
    caption: '그림 2호 — 보아뱀 속의 코끼리',
  },
  sheep: {
    viewBox: '0 0 32 20',
    rects: [...SHEEP_BODY('#f4f1e8', '#4a4038'), [10, 4, 10, 1, '#e6e0d0']],
    caption: '양',
  },
  sheep2: {
    viewBox: '0 0 32 20',
    rects: [
      ...SHEEP_BODY('#f4f1e8', '#4a4038'),
      [20, 4, 2, 2, '#c9a46a'],
      [25, 4, 2, 2, '#c9a46a'],
    ],
    caption: '뿔 달린 숫양',
  },
  sheep3: {
    viewBox: '0 0 32 20',
    rects: [...SHEEP_BODY('#dcd6c8', '#6b6159'), [24, 11, 1, 3, '#f4f1e8']],
    caption: '너무 늙은 양',
  },
  box: {
    viewBox: '0 0 32 20',
    rects: [
      [6, 4, 20, 13, '#c99a5b'],
      [6, 4, 20, 1, BROWN],
      [6, 16, 20, 1, BROWN],
      [6, 4, 1, 13, BROWN],
      [25, 4, 1, 13, BROWN],
      [11, 9, 2, 2, '#2b2418'],
      [16, 9, 2, 2, '#2b2418'],
      [21, 9, 2, 2, '#2b2418'],
    ],
    caption: '구멍 뚫린 상자',
  },
  baobab: {
    viewBox: '0 0 40 26',
    rects: [
      [12, 12, 16, 1, '#5b8de8'],
      [9, 13, 22, 1, '#5b8de8'],
      [7, 14, 26, 2, '#5b8de8'],
      [6, 16, 28, 4, '#5b8de8'],
      [7, 20, 26, 2, '#5b8de8'],
      [9, 22, 22, 1, '#5b8de8'],
      [12, 23, 16, 1, '#5b8de8'],
      [9, 8, 2, 6, BROWN],
      [6, 5, 8, 4, '#2fae6e'],
      [19, 5, 3, 8, BROWN],
      [15, 1, 11, 5, '#2fae6e'],
      [29, 8, 2, 6, BROWN],
      [26, 5, 8, 4, '#2fae6e'],
    ],
    caption: '바오바브나무가 자란 별',
  },
  boabeast: {
    viewBox: '0 0 46 20',
    rects: [
      // 삼켜지는 맹수의 뒷몸(입 밖으로 나온 부분) — 먼저 그리고 턱을 위에 덮는다
      [34, 7, 8, 5, '#e0913a'],
      [36, 7, 1, 5, '#7a4a1e'],
      [39, 7, 1, 5, '#7a4a1e'],
      [38, 12, 2, 4, '#e0913a'],
      [41, 12, 1, 4, '#e0913a'],
      [42, 6, 1, 2, '#e0913a'],
      [43, 4, 2, 2, '#e0913a'],
      // 보아뱀 몸통(물결)
      [2, 13, 9, 3, '#3f8f4e'],
      [9, 10, 3, 5, '#3f8f4e'],
      [11, 9, 8, 3, '#3f8f4e'],
      [18, 10, 3, 5, '#3f8f4e'],
      [20, 13, 8, 3, '#3f8f4e'],
      [26, 10, 3, 5, '#3f8f4e'],
      [28, 8, 3, 4, '#3f8f4e'],
      // 무늬
      [4, 14, 1, 1, '#2f6e3b'],
      [7, 14, 1, 1, '#2f6e3b'],
      [14, 10, 1, 1, '#2f6e3b'],
      [23, 14, 1, 1, '#2f6e3b'],
      // 머리와 크게 벌린 턱
      [30, 5, 3, 9, '#3f8f4e'],
      [32, 5, 5, 2, '#3f8f4e'],
      [32, 12, 5, 2, '#3f8f4e'],
      [31, 6, 1, 1, '#ffffff'],
    ],
    caption: '보아뱀이 맹수를 삼키는 그림',
  },
  portrait: {
    viewBox: '0 0 32 24',
    rects: [
      [8, 1, 16, 22, '#c9a24b'],
      [10, 3, 12, 18, '#f4ecd8'],
      [13, 5, 6, 3, '#f2c94c'],
      [12, 6, 1, 2, '#f2c94c'],
      [19, 6, 1, 2, '#f2c94c'],
      [14, 8, 4, 3, '#f5cfa8'],
      [15, 9, 1, 1, '#4a3a2a'],
      [17, 9, 1, 1, '#4a3a2a'],
      [12, 11, 8, 2, '#d6505f'],
      [20, 11, 2, 1, '#d6505f'],
      [13, 13, 6, 6, '#5f7f4a'],
      [15, 15, 2, 1, '#f2c94c'],
    ],
    caption: '어린 왕자의 초상',
  },
};

export const PixelPicture = ({
  name,
  className,
}: {
  name: TypingPictureKey;
  className?: string;
}) => {
  const picture = PICTURES[name];
  return (
    <figure className={className}>
      {picture.rects ? (
        <svg
          viewBox={picture.viewBox}
          shapeRendering='crispEdges'
          role='img'
          aria-label={picture.caption}
        >
          {picture.rects.map(([x, y, w, h, fill], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
          ))}
        </svg>
      ) : (
        <div data-empty>그림 자리 · 준비 중</div>
      )}
      <figcaption>{picture.caption}</figcaption>
    </figure>
  );
};
