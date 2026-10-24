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
  src: '/badges/editorial/story-art-v2.png',
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
  src: '/badges/editorial/companion-art-v2.png',
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
  'double-finish': companion(4, '#8c3525', '#f9ecd1'),
  honest: companion(5, '#f3f0e5', '#1d201e'),
  'thin-but-deep': companion(6, '#d9d9d0', '#243e60'),
  'new-release': companion(7, '#f66626', '#151715'),
  'book-about-books': companion(8, '#f2eee5', '#bc2526'),
  'worn-out': companion(9, '#ecdfc2', '#714125'),
  unwritten: companion(10, '#c9c8c1', '#35434a'),
};

export const badgeCoverArt = (cover: CoverId) => COVER_ART[cover];
