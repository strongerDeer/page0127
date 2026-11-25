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
  // 아직 그리지 않은 그림 — 자리만 둔다
  boabeast: {
    viewBox: '',
    rects: null,
    caption: '보아뱀이 맹수를 삼키는 그림',
  },
  portrait: { viewBox: '', rects: null, caption: '어린 왕자의 초상' },
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
      <figcaption>{picture.caption} · page0127.이 그린 도트 그림</figcaption>
    </figure>
  );
};
