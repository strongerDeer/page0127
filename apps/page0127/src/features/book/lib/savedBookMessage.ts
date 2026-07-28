/**
 * 저장 직후 결과 카드에 띄울 확인 문구를 만든다.
 *
 * 컴포넌트에서 분리한 이유: 이 저장소에는 React 컴포넌트 테스트 하네스가 없어서,
 * 문구가 조용히 바뀌는 것을 잡을 방법이 이 함수의 단위 테스트뿐이다.
 *
 * @param completedCount 사용자의 완독 권수. 통계 조회에 실패하면 null 또는 0
 * @param readCount 이 책을 몇 번째로 읽었는지 (재독이면 2 이상)
 */
export const savedBookMessage = (
  completedCount: number | null,
  readCount: number
): string => {
  // 재독은 "몇 권째"보다 "몇 회독"이 사용자에게 더 정확한 사건이다
  if (readCount > 1) return `${readCount}회독을 기록했어요`;

  // 통계를 못 가져와도 저장은 성공했다 — 숫자만 빼고 확인은 해준다.
  // 0(이하)도 "모름"이다: getBookStats 는 DB·RLS 에러를 스스로 잡아 totalCompletedBooks: 0 을
  // 반환하고 라우트가 그걸 200 으로 감싸므로, 0 은 조회 실패 신호다.
  // 성공한 호출은 방금 저장한 완독 행 때문에 최소 1 이라 0 이 나올 수 없다
  // → 0 을 첫 권으로 읽으면 30권 읽은 사용자에게 "첫 번째 책"이라고 말한다.
  if (completedCount === null || completedCount < 1) return '책장에 꽂혔어요';

  // 위 검사를 통과한 1 은 방금 저장한 그 한 권 — 진짜 첫 권이다
  if (completedCount === 1) return '첫 번째 책이 책장에 꽂혔어요';

  return `${completedCount}번째 책이 책장에 꽂혔어요`;
};
