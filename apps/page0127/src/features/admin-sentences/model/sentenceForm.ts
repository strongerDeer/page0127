/**
 * 어드민 문장 입력 검사 — 숫자는 마이그레이션 20261109000200 의 CHECK 와 같다.
 * 폼(FormData)의 문자열을 저장할 값으로 바꾸고, 잘못되면 이유를 돌려준다.
 */
export const SENTENCE_MAX_LENGTH = 300;
export const BOOK_TITLE_MAX_LENGTH = 200;

export type SentenceValues = {
  text: string;
  book_title: string;
  author: string | null;
  translator: string | null;
  page: number | null;
  isbn: string | null;
  rights_note: string | null;
};

export type SentenceFormResult =
  { ok: true; value: SentenceValues } | { ok: false; message: string };

const str = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';

const optional = (value: FormDataEntryValue | null): string | null =>
  str(value) || null;

/** Postgres char_length 와 같은 기준(코드 포인트)으로 센다 */
const count = (text: string) => [...text].length;

export const parseSentenceForm = (form: FormData): SentenceFormResult => {
  const text = str(form.get('text'));
  const bookTitle = str(form.get('book_title'));
  const pageText = str(form.get('page'));

  if (!text) return { ok: false, message: '문장을 적어 주세요.' };
  if (count(text) > SENTENCE_MAX_LENGTH)
    return {
      ok: false,
      message: `문장은 ${SENTENCE_MAX_LENGTH}자까지예요.`,
    };
  if (!bookTitle) return { ok: false, message: '책 제목을 적어 주세요.' };
  if (count(bookTitle) > BOOK_TITLE_MAX_LENGTH)
    return { ok: false, message: '책 제목이 너무 길어요.' };

  let page: number | null = null;
  if (pageText) {
    if (!/^\d+$/.test(pageText))
      return { ok: false, message: '쪽수는 숫자로 적어 주세요.' };
    page = Number(pageText);
    if (page < 1 || page > 99999)
      return { ok: false, message: '쪽수를 다시 확인해 주세요.' };
  }

  return {
    ok: true,
    value: {
      text,
      book_title: bookTitle,
      author: optional(form.get('author')),
      translator: optional(form.get('translator')),
      page,
      isbn: optional(form.get('isbn')),
      rights_note: optional(form.get('rights_note')),
    },
  };
};
