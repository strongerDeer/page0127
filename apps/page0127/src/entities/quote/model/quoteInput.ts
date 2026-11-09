/**
 * 책 문장 입력 규칙 — 폼(클라이언트)과 서버 액션이 같은 함수를 쓴다.
 *
 * 숫자는 마이그레이션 20261109000100_book_quotes.sql 의 CHECK 와 같아야 한다.
 * 폼 검증은 "바로 알려 주는 UX", DB CHECK 는 "어떤 경로로 들어와도 지키는 무결성"이다.
 */
export const QUOTE_MAX_LENGTH = 200;
export const QUOTE_MAX_PAGE = 99999;

/**
 * 글자 수 = 유니코드 코드 포인트 수.
 *
 * `'😀'.length` 는 2 다(UTF-16 코드 유닛 둘). Postgres char_length 는 1 로 센다.
 * 같은 문장을 폼은 201자, DB 는 200자로 보면 안 되므로 [...text] 로 센다.
 */
export const countQuoteChars = (text: string): number => [...text].length;

/** 줄바꿈은 \n 하나로, 앞뒤 공백은 지운다 — 문장 안의 줄바꿈(시)은 살린다 */
export const normalizeQuoteText = (text: string): string =>
  text.replace(/\r\n?/g, '\n').trim();

export type QuoteInput = { text: string; page: number | null };

export type QuoteInputResult =
  { ok: true; value: QuoteInput } | { ok: false; message: string };

/**
 * FormData 에서 온 문자열을 검사해 저장할 값으로 바꾼다.
 * 쪽수는 비워도 된다. 숫자가 아니거나 범위를 벗어나면 막는다.
 */
export const parseQuoteInput = (
  rawText: unknown,
  rawPage: unknown
): QuoteInputResult => {
  const text = normalizeQuoteText(typeof rawText === 'string' ? rawText : '');
  if (!text) return { ok: false, message: '문장을 적어 주세요.' };
  if (countQuoteChars(text) > QUOTE_MAX_LENGTH)
    return {
      ok: false,
      message: `문장은 ${QUOTE_MAX_LENGTH}자까지 적을 수 있어요.`,
    };

  const pageText = typeof rawPage === 'string' ? rawPage.trim() : '';
  if (!pageText) return { ok: true, value: { text, page: null } };
  if (!/^\d+$/.test(pageText))
    return { ok: false, message: '쪽수는 숫자로 적어 주세요.' };
  const page = Number(pageText);
  if (page < 1 || page > QUOTE_MAX_PAGE)
    return { ok: false, message: '쪽수를 다시 확인해 주세요.' };

  return { ok: true, value: { text, page } };
};
