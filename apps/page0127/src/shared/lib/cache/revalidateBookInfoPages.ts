import { revalidatePath } from 'next/cache';

/**
 * 캐시된 책 정보 페이지(/books/info/[id])를 전부 버린다 — 다음 방문 때 새로 만든다.
 *
 * 책 정보 페이지는 CDN 에 1시간 캐시된다(ISR). 그 사이 누가 책을 기록·수정·삭제하거나
 * 검수에서 책이 승인되면, 완독 수·별점·리더 수·책 존재 여부(404)가 바뀐다.
 * 그래서 책 기록을 바꾸는 곳마다 이걸 불러 "진열대의 지난 판"을 바로 치운다.
 *
 * 왜 책 하나가 아니라 전부인가: 기록 쪽은 ISBN 을 알지만 페이지 주소는 global_books.id 라
 * 하나만 고르려면 조회가 한 번 더 든다. 버리는 건 공짜고 다시 만드는 건 실제로 열린 페이지만이라
 * 기록이 하루 몇 건인 지금은 전부 버리는 쪽이 단순하고 빠지는 경우가 없다.
 *
 * 경로에 라우트 그룹 이름을 넣어야 한다 — 패턴은 파일 구조를 가리킨다(Next revalidatePath 문서).
 */
export const revalidateBookInfoPages = () => {
  revalidatePath('/(static)/books/info/[id]', 'page');
};
