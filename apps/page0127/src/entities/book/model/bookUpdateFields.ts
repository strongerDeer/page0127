import type { BookInput } from '../types';

/**
 * 책 수정(PATCH /api/books/:id)에서 받아도 되는 칸 — 허용 목록(allowlist).
 *
 * 왜 필요한가(Mass Assignment, OWASP API3):
 * 예전에는 요청 본문을 `...body` 로 통째로 update 에 넣었다. 화면은 별점·상태만 보내도
 * 요청을 직접 만들면 id·user_id·created_at·catalog_review_status 처럼 화면에 없는 칸도
 * 끼워 넣을 수 있다. 지금은 RLS(남의 책으로 옮기기)와 apply_book_catalog_review 트리거
 * (서지·표지·검수 상태)가 막지만, 막는 곳이 DB 뒤쪽에만 있으면 새 칸이 생길 때마다 구멍이 된다.
 * 그래서 API 입구에서 "받는 칸"을 먼저 정한다 — 차단 목록(denylist)과 달리 새 칸은 기본으로 막힌다.
 *
 * `satisfies` 로 BookInput 의 키만 쓸 수 있게 묶어, 오타나 없는 칸은 타입 검사에서 걸린다.
 * source_url 은 공용 도서(global_books) 검수 자료라 독서 기록(books) 칸이 아니어서 뺐다.
 */
export const BOOK_UPDATE_FIELDS = [
  // 책을 다시 고를 때 함께 바뀌는 서지 정보(트리거가 공용 도서 값으로 다시 맞춘다)
  'isbn',
  'title',
  'sub_title',
  'source',
  'provider_item_id',
  'thickness_mm',
  'author',
  'publisher',
  'cover_image',
  'spine_image',
  'description',
  'pub_date',
  'category',
  'page_count',
  'toc',
  // 독서 기록
  'status',
  'read_count',
  'start_date',
  'completed_date',
  'completed_year',
  'rating',
  'is_life_book',
  'one_line_review',
  'personal_memo',
  'tags',
  'is_public',
] as const satisfies readonly (keyof BookInput)[];

type BookUpdateField = (typeof BOOK_UPDATE_FIELDS)[number];

/** 요청 본문에서 허용된 칸만 골라 낸다. 객체가 아니면 빈 객체 */
export const pickBookUpdate = (
  body: unknown
): Partial<Pick<BookInput, BookUpdateField>> => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const source = body as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const field of BOOK_UPDATE_FIELDS) {
    if (Object.hasOwn(source, field)) picked[field] = source[field];
  }
  return picked as Partial<Pick<BookInput, BookUpdateField>>;
};
