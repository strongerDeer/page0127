import type { BadgeId } from './badges';

type CoverId = BadgeId | 'unwritten';
type CoverArt = {
  src: string;
  crop?: { x: number; y: number; width: number; height: number };
  width: number;
  height: number;
  columns: number;
  rows: number;
  column: number;
  row: number;
  paper: string;
  ink: string;
};

/** 생성 시트의 실제 셀 경계를 사용해 이웃 표지의 가장자리가 섞이지 않게 한다. */
const cellCrop = (index: number, xs: number[], ys: number[]) => {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: xs[col]! + 1,
    y: ys[row]! + 1,
    width: xs[col + 1]! - xs[col]! - 2,
    height: ys[row + 1]! - ys[row]! - 2,
  };
};

const story = (index: number, paper: string, ink: string): CoverArt => ({
  src: '/badges/editorial/story-art-v3.png',
  crop: cellCrop(index, [0, 362, 724, 1086], [0, 482, 960, 1448]),
  width: 1086,
  height: 1448,
  columns: 3,
  rows: 3,
  column: index % 3,
  row: Math.floor(index / 3),
  paper,
  ink,
});
const companion = (index: number, paper: string, ink: string): CoverArt => ({
  src: '/badges/editorial/companion-art-v7.png',
  crop: cellCrop(index, [0, 313, 627, 941], [0, 437, 866, 1265, 1672]),
  width: 941,
  height: 1672,
  columns: 3,
  rows: 4,
  column: index % 3,
  row: Math.floor(index / 3),
  paper,
  ink,
});

const expansion = (index: number, paper: string, ink: string): CoverArt => ({
  src: '/badges/editorial/expansion-art-v5.png',
  crop: cellCrop(index, [0, 315, 627, 941], [0, 422, 836, 1242, 1672]),
  width: 941,
  height: 1672,
  columns: 3,
  rows: 4,
  column: index % 3,
  row: Math.floor(index / 3),
  paper,
  ink,
});

/** 완성된 표지 아트를 같은 크기의 셀로 보여준다. 표지 글자와 질감을 코드로 다시 그리지 않는다. */
const COVER_ART: Record<CoverId, CoverArt> = {
  classics: expansion(0, '#f0e4cc', '#5a3e30'),
  regular: expansion(1, '#d8e8df', '#25574a'),
  compatibility: expansion(11, '#e0deef', '#4c3d74'),
  fiction: expansion(2, '#d9e4ef', '#223c62'),
  humanities: expansion(3, '#ece2d0', '#5c4a35'),
  essays: expansion(4, '#f1dfd7', '#704735'),
  business: expansion(5, '#dae7e4', '#315c53'),
  'self-growth': expansion(6, '#e8e7cd', '#52602d'),
  science: expansion(7, '#dce5ef', '#2a476d'),
  arts: expansion(8, '#ecdee9', '#693e61'),
  history: expansion(9, '#eadccf', '#744a30'),
  shelf: companion(0, '#f4ecd5', '#29261e'),
  'wide-view': companion(1, '#b5d9e9', '#17365b'),
  'one-sitting': story(0, '#f87920', '#172981'),
  brick: story(1, '#f1ead8', '#312b21'),
  'author-fan': story(2, '#594332', '#f4e9d6'),
  finally: story(3, '#f6f2e9', '#b14736'),
  reread: story(4, '#284957', '#fff1cf'),
  'life-book': story(5, '#f4eedf', '#1d5963'),
  critic: story(6, '#f1ebdc', '#252824'),
  'goal-kept': story(7, '#f8e4a4', '#165a3d'),
  'know-yourself': story(8, '#e8dfd4', '#142a45'),
  'day-0127': companion(2, '#f4efde', '#231e1b'),
  'new-year': companion(3, '#d0dce2', '#1f3b65'),
  'double-finish': companion(4, '#f2ead8', '#0e4288'),
  honest: companion(5, '#f3f0e5', '#1d201e'),
  'thin-but-deep': companion(6, '#d9d9d0', '#243e60'),
  'new-release': companion(7, '#f66626', '#151715'),
  'book-about-books': companion(8, '#f2eee5', '#bc2526'),
  'worn-out': companion(9, '#f0ead7', '#123e2d'),
  unwritten: {
    ...companion(10, '#c9c8c1', '#35434a'),
    src: '/badges/editorial/companion-art-v2.png',
    crop: undefined,
    width: 941,
    height: 1672,
  },
};

export const badgeCoverArt = (cover: CoverId) => COVER_ART[cover];

/**
 * 화면에 싣는 시트 사본의 폭(px). scripts/build-badge-art.mjs 의 WIDTHS 와 같아야 한다.
 * 배지 한 칸이 76~88px 이고 시트는 3열이라 CSS 폭 228~264px —
 * 데스크탑(1x)은 384, Lighthouse 모바일(1.75x)은 480, 3x 폰은 800 을 고른다.
 */
export const BADGE_ART_WIDTHS = [384, 480, 640, 800] as const;

/**
 * 원본 PNG 경로를 미리 만든 AVIF·WebP 사본의 srcSet 으로 바꾼다.
 * 원본 2MB PNG 를 Next 이미지 최적화로 줄이면 640px 한 장이 100~170KB 라
 * 홈·프로필 이미지 전송량이 400KB 넘게 늘었다(2026-10-26 주간 품질 회귀).
 */
const sizedBase = (src: string) =>
  src
    .replace('/badges/editorial/', '/badges/editorial/sized/')
    .replace(/\.png$/, '');

export const badgeArtSrcSet = (src: string, format: 'avif' | 'webp') =>
  BADGE_ART_WIDTHS.map((w) => `${sizedBase(src)}-${w}.${format} ${w}w`).join(
    ', '
  );

/** srcSet 을 모르는 브라우저용 — 모바일에서 가장 많이 고르는 480 WebP */
export const badgeArtFallbackSrc = (src: string) =>
  `${sizedBase(src)}-480.webp`;

/**
 * 시트(아틀라스)에서 표지 한 칸만 보이게 놓는 위치 — **가로·세로 같은 배율**로 키운다.
 *
 * 왜(2026-11-24): 예전엔 폭은 "칸 폭 기준", 높이는 "칸 높이 기준"으로 따로 늘려서, 표지 칸 비율과
 * 그림 칸 비율이 다르면 그림이 1~7% 늘어났다(Lighthouse 권장사항 "이미지 가로세로 비율" 감점,
 * companion 표시 0.60 vs 원본 0.56). 이제 폭에만 맞추고 높이는 원본 비율(height:auto)을 따른다.
 * 칸이 표지보다 조금 길면 위아래가 살짝 잘린다(가운데 정렬) — 늘어나는 것보다 낫다.
 *
 * 단위: .cover 가 `container-type: inline-size` 라 cqw = 표지 폭. top 의 50% 는 표지 높이.
 */
/** 표지 높이(cqw) — .book 이 3:4 이고 .cover 가 아래 2% 를 비운다(BadgeMedal.module.css). */
const COVER_HEIGHT_CQW = (4 / 3) * 98;

export const badgeAtlasStyle = (art: CoverArt) => {
  const cell = art.crop ?? {
    x: (art.width / art.columns) * art.column,
    y: (art.height / art.rows) * art.row,
    width: art.width / art.columns,
    height: art.height / art.rows,
  };
  // 칸이 표지를 빈틈없이 덮는 배율(object-fit: cover 와 같은 계산). 시트 1px 이 몇 cqw 인지.
  const perCqw = Math.max(100 / cell.width, COVER_HEIGHT_CQW / cell.height);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    width: `${round(art.width * perCqw)}cqw`,
    height: 'auto',
    // 칸 가운데를 표지 가운데에 맞춘다(폭 50cqw, 높이 50%)
    left: `${round(50 - (cell.x + cell.width / 2) * perCqw)}cqw`,
    top: `calc(50% - ${round((cell.y + cell.height / 2) * perCqw)}cqw)`,
  };
};
