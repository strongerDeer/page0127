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
  cover_image: string | null;
  rights_note: string | null;
};

export type SentenceFormResult =
  { ok: true; value: SentenceValues } | { ok: false; message: string };

const str = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : '';

const optional = (value: FormDataEntryValue | null): string | null =>
  str(value) || null;

/**
 * 표지 주소는 화면이 next/image 로 그린다 — next.config 의 remotePatterns 에 없는 호스트면
 * 사용자 서재 카드가 통째로 깨진다. 그래서 서점(YES24)과 우리 Storage 만 받는다.
 */
const coverHosts = () => {
  const hosts = ['image.yes24.com'];
  try {
    hosts.push(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname);
  } catch {
    // 환경 변수가 없으면(테스트 등) YES24 만
  }
  return hosts;
};

export const isAllowedCoverUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && coverHosts().includes(url.hostname);
  } catch {
    return false;
  }
};

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

  const coverImage = optional(form.get('cover_image'));
  if (coverImage && !isAllowedCoverUrl(coverImage))
    return {
      ok: false,
      message: '표지는 책 검색에서 골라 주세요(서점·우리 저장소 주소만 돼요).',
    };

  return {
    ok: true,
    value: {
      text,
      book_title: bookTitle,
      author: optional(form.get('author')),
      translator: optional(form.get('translator')),
      page,
      isbn: optional(form.get('isbn')),
      cover_image: coverImage,
      rights_note: optional(form.get('rights_note')),
    },
  };
};
