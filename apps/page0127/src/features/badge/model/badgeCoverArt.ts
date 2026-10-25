import type { BadgeId } from './badges';

type CoverId = BadgeId | 'unwritten';
type CoverArt = {
  src: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  column: number;
  row: number;
  paper: string;
  ink: string;
};

const story = (index: number, paper: string, ink: string): CoverArt => ({
  src: '/badges/editorial/story-art-v3.png',
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
  technology: expansion(10, '#d8e8ed', '#25546a'),
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
    width: 941,
    height: 1672,
  },
};

export const badgeCoverArt = (cover: CoverId) => COVER_ART[cover];
