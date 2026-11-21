// entities/book-guide public API — 읽기 가이드(책마다 코드 파일, guides/)
export { hasBookGuide, loadBookGuide } from './guides';
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
} from './model/types';
export { GUIDE_CANVAS_WIDTH } from './model/types';
export { BookGuide } from './ui/BookGuide';
export { CanvasPeople } from './ui/CanvasPeople';
