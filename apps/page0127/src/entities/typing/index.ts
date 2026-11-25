// entities/typing public API — 온라인 필사(타자로 따라 쓰기)
export {
  LITTLE_PRINCE_CHAPTERS,
  LITTLE_PRINCE_FAMOUS,
  LITTLE_PRINCE_TOTAL_CHAPTERS,
  LITTLE_PRINCE_WORK,
} from './content/littlePrince';
export type { TypingProgress, TypingSheet } from './model/pages';
export {
  computeProgress,
  estimateTotalChars,
  FAMOUS_SHEETS,
  firstUnwrittenIndex,
  FULL_SHEETS,
  OPEN_CHAPTERS,
  splitLines,
} from './model/pages';
export { judgeTyping, strokesOf, strokesPerMinute } from './model/strokes';
export type {
  TypingBoard,
  TypingPictureKey,
  TypingRankRow,
  TypingRecord,
} from './model/types';
