import { isValidIsbn13 } from '@/shared/lib/isbn';

export const REVIEW_LABELS = {
  pending: '검수 대기',
  approved: '승인',
  needs_changes: '보완 요청',
  rejected: '반려',
} as const;
export type ReviewStatus = keyof typeof REVIEW_LABELS;
export const REVIEW_COLUMNS =
  'id,isbn,title,author,publisher,source_url,review_status,review_note,review_version,submitted_by,created_at,reviewed_at';
export type BookReview = {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  source_url: string | null;
  review_status: ReviewStatus;
  review_note: string | null;
  review_version: number;
  submitted_by: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export function validateManualBook(input: Record<string, unknown>) {
  const text = (key: string) =>
    typeof input[key] === 'string' ? input[key].trim() : '';
  const title = text('title');
  const author = text('author');
  const publisher = text('publisher');
  const sourceUrl = text('source_url');
  const rawIsbn = text('isbn');
  const isbn = rawIsbn.startsWith('manual:')
    ? rawIsbn
    : rawIsbn.replace(/[\s-]/g, '');
  if (
    !title ||
    title.length > 200 ||
    !author ||
    author.length > 200 ||
    publisher.length > 200
  ) {
    throw new Error(
      '제목과 저자를 입력해 주세요. 각 항목은 200자까지 입력할 수 있어요.'
    );
  }
  if (
    isbn &&
    !/^manual:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      isbn
    ) &&
    !isValidIsbn13(isbn)
  ) {
    throw new Error(
      'ISBN은 유효한 13자리 도서 번호로 입력해 주세요. 없으면 비워두세요.'
    );
  }
  if (sourceUrl) {
    let url: URL;
    try {
      url = new URL(sourceUrl);
    } catch {
      throw new Error('출처는 올바른 웹 주소로 입력해 주세요.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      sourceUrl.length > 2000
    ) {
      throw new Error('출처는 https 웹 주소로 입력해 주세요.');
    }
  }
  return { title, author, publisher, source_url: sourceUrl || null, isbn };
}

/** 사용자 입력 출처는 링크로만 제공한다. 서버에서 임의 URL을 가져오지 않는다. */
export function safeSourceUrl(value: string | null): string | null {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
