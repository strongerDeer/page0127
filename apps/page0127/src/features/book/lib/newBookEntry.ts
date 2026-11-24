/**
 * 헤더 "도서 추가"(+) → 도서 추가 페이지에 "새로 기록할래요" 신호 보내기
 *
 * 왜 이벤트인가: 이미 /books/add 에 있을 때 같은 주소로 Link 를 누르면
 * App Router 는 페이지 컴포넌트를 언마운트하지 않고 재사용한다 → useState 가 그대로 남아
 * 완독 결과 카드("N번째 책이 책장에 꽂혔어요")가 계속 보인다(2026-11-24 HJ).
 * GNB 는 서버 컴포넌트이고 페이지 state 를 모르므로, 이벤트 하나로만 느슨하게 잇는다.
 * 페이지가 열려 있지 않으면 듣는 쪽이 없어 아무 일도 일어나지 않는다.
 *
 * window 대신 모듈 전용 EventTarget 을 쓴다 — 이름 충돌이 없고, window 가 없는
 * node 테스트 환경에서도 그대로 돌아간다. 클라이언트 번들에서 모듈은 한 번만 평가되므로
 * GNB 와 페이지가 같은 target 을 본다.
 */
const NEW_BOOK_ENTRY_EVENT = 'new-book-entry';
const target = new EventTarget();

export const requestNewBookEntry = () => {
  target.dispatchEvent(new Event(NEW_BOOK_ENTRY_EVENT));
};

/** 구독 해제 함수를 돌려준다 — useEffect 의 cleanup 으로 그대로 쓴다 */
export const onNewBookEntryRequest = (handler: () => void) => {
  target.addEventListener(NEW_BOOK_ENTRY_EVENT, handler);
  return () => target.removeEventListener(NEW_BOOK_ENTRY_EVENT, handler);
};
