/**
 * 서재 화면이 쓰는 칸만 받는다.
 *
 * 받은 책은 전부 클라이언트 컴포넌트(PublicLibraryContent)의 props 로 넘어가서 HTML 안에
 * JSON 으로 실린다(RSC payload). `select('*')` 면 화면에 안 쓰는 책 소개·목차·메모까지
 * 권수만큼 실려 온다 — 1만 권 실험에서 HTML 의 3분의 1이 책 소개였다.
 *
 * 빠진 칸: description·toc(책 소개·목차 — 상세 페이지가 따로 읽는다), personal_memo(book_memos 로 옮김),
 * tags, sub_title, source, requested_public, updated_at.
 * 서재에서 새로 쓰는 칸이 생기면 여기에 더해야 한다.
 *
 * ⚠️ provider_item_id 는 빼면 안 된다. toCoverSource 가 이 값(YES24 상품번호)으로
 * 작은 YES24 사본(M·L, 7~19KB)을 고르고, 없으면 Storage 사본(폭 500px, 36~72KB)으로
 * 떨어진다. #455(2026-11-20)에서 빠져 프로필 표지가 전부 큰 사본으로 나갔다(2026-11-23 발견).
 */
export const LIBRARY_BOOK_COLUMNS = [
  'id',
  'user_id',
  'isbn',
  'title',
  'author',
  'publisher',
  'cover_image',
  'provider_item_id',
  'spine_image',
  'pub_date',
  'category',
  'status',
  'start_date',
  'completed_date',
  'completed_year',
  'rating',
  'is_life_book',
  'one_line_review',
  'created_at',
  'page_count',
  'thickness_mm',
  'is_public',
  'read_count',
  'reading_reminded_at',
  'catalog_review_status',
].join(',');
