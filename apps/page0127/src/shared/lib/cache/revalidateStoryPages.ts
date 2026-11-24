import { revalidatePath, revalidateTag } from 'next/cache';

import { STORIES_CACHE_TAG } from './cacheTags';

/**
 * 책 이야기 글을 저장·공개·삭제한 뒤 부른다 — 배포 없이 다음 방문자부터 새 글이 보인다.
 *
 * 왜 여러 곳을 버리나: 글 하나가 네 곳에 나온다.
 * - /blog 목록, /blog/[slug] 본문과 공유 이미지 (ISR)
 * - 책 정보 페이지의 "책 이야기" 카드 (/books/info/[id], ISR)
 * - 위 페이지들이 함께 쓰는 공개 글 데이터 캐시 (unstable_cache, STORIES_CACHE_TAG)
 *
 * `{ expire: 0 }` = 다음 방문자가 지난 판을 보지 않고 새로 만든 결과를 받는다.
 * 경로에 라우트 그룹 이름을 넣어야 패턴이 파일 구조를 가리킨다(revalidateBookInfoPages 와 같은 이유).
 */
export const revalidateStoryPages = () => {
  revalidateTag(STORIES_CACHE_TAG, { expire: 0 });
  revalidatePath('/(static)/blog', 'page');
  // 'layout' — 글 페이지와 그 아래 경로까지 함께 버린다. 공유 이미지는 주소에 수정 시각(?v=)이 붙어 저장하면 새 주소가 된다
  revalidatePath('/(static)/blog/[slug]', 'layout');
  revalidatePath('/(static)/books/info/[id]', 'page');
  revalidatePath('/admin/stories');
};
