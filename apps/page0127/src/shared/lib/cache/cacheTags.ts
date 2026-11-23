/**
 * unstable_cache 태그 모음 — 캐시를 만드는 곳(entities)과 버리는 곳(shared/lib/cache)이
 * 같은 이름을 쓰게 한 곳에 둔다. shared 는 entities 를 import 할 수 없어서 여기 있다.
 */

/** 전체 도서(/books/all) 비로그인용 목록. 책이 추가·승인·삭제되면 revalidateBookInfoPages() 가 버린다 */
export const BOOKS_ALL_CACHE_TAG = 'books-all-catalog';

/** 책 이야기(/blog) 공개 글 목록·본문. 어드민에서 글을 저장·삭제하면 revalidateStoryPages() 가 버린다 */
export const STORIES_CACHE_TAG = 'stories';
