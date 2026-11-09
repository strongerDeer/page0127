// entities/daily-sentence public API — 오늘의 문장(운영자 풀에서 하루 한 문장)
export { getDailySentences, hasDailySentences } from './api/getDailySentences';
export { formatSentenceSource } from './model/sentenceSource';
export type { DailySentence } from './model/types';
