// entities/book-guide public API — 읽기 가이드(인물관계도·연표·산책 코스)
export { getBookGuide } from './api/getBookGuide';
export type {
  BookGuideSection,
  GuideLinkKind,
  GuidePerson,
  PeopleSection,
  PlacesSection,
  TimelineSection,
} from './model/bookGuideSchema';
export {
  bookGuideSectionsSchema,
  parseBookGuideSections,
} from './model/bookGuideSchema';
export { BookGuide } from './ui/BookGuide';
