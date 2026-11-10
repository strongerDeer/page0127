// entities/quote public API — 책 문장 기록("내가 모은 문장")
// 외부 슬라이스/레이어는 항상 '@/entities/quote'를 통해 import 한다

export { getBookQuotes } from './api/getBookQuotes';
export { getQuoteShelf } from './api/getQuoteShelf';
export { getRandomQuote } from './api/getRandomQuote';
export {
  countQuoteChars,
  normalizeQuoteText,
  parseQuoteInput,
  QUOTE_MAX_LENGTH,
  QUOTE_MAX_PAGE,
  type QuoteInput,
  type QuoteInputResult,
} from './model/quoteInput';
export {
  groupQuotesByBook,
  type QuoteShelfBook,
  type QuoteShelfGroup,
} from './model/quoteShelf';
export type { BookQuote, RandomQuote } from './model/types';
