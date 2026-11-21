import { BookGuide } from '../ui/BookGuide';
import { daeonsilSections } from './daeonsil.data';

/** 『대온실 수리 보고서』 — 피그마 카드와 같은 관계도·연표·산책 코스 */
export const DaeonsilGuide = () => <BookGuide sections={daeonsilSections} />;
