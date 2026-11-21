// entities/book-guide public API — 읽기 가이드(인물관계도·연표·산책 코스)
export { getBookGuide } from './api/getBookGuide';
export type {
  BookGuideSection,
  GuideBackground,
  GuideBorder,
  GuideColor,
  GuideFont,
  GuideGroup,
  GuideLink,
  GuideLinkKind,
  GuidePerson,
  GuideRect,
  GuideTone,
  PeopleSection,
  PlacesSection,
  TimelineSection,
} from './model/bookGuideSchema';
export {
  bookGuideSectionsSchema,
  GUIDE_BORDER_STYLES,
  GUIDE_CANVAS_WIDTH,
  GUIDE_COLORS,
  GUIDE_FONTS,
  GUIDE_TONES,
  parseBookGuideSections,
} from './model/bookGuideSchema';
export type { CanvasLayout } from './model/canvasLayout';
export { buildCanvasLayout } from './model/canvasLayout';
export { BookGuide } from './ui/BookGuide';
export { CanvasPeople } from './ui/CanvasPeople';
