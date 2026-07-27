/**
 * 저장 직후 결과 카드에 띄울 확인 문구를 만든다.
 *
 * 컴포넌트에서 분리한 이유: 이 저장소에는 React 컴포넌트 테스트 하네스가 없어서,
 * 문구가 조용히 바뀌는 것을 잡을 방법이 이 함수의 단위 테스트뿐이다.
 *
 * @param completedCount 사용자의 완독 권수. 통계 조회에 실패하면 null
 * @param readCount 이 책을 몇 번째로 읽었는지 (재독이면 2 이상)
 */
export const savedBookMessage = (
  completedCount: number | null,
  readCount: number
): string => {
  // 재독은 "몇 권째"보다 "몇 회독"이 사용자에게 더 정확한 사건이다
  if (readCount > 1) return `${readCount}회독을 기록했어요`;

  // 통계를 못 가져와도 저장은 성공했다 — 숫자만 빼고 확인은 해준다
  if (completedCount === null) return '책장에 꽂혔어요';

  // 0은 통계가 방금 저장분을 아직 세지 않은 경우 — 첫 권으로 본다
  if (completedCount <= 1) return '첫 번째 책이 책장에 꽂혔어요';

  return `${completedCount}번째 책이 책장에 꽂혔어요`;
};
