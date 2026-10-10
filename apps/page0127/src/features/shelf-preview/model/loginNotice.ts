import type { PendingShelf } from './pendingShelf';

/**
 * 로그인 화면에서 맛보기의 맥락을 잇는 한 줄.
 * "책장 저장하기"를 누르고 온 사람에게 "어서 오세요"만 보이면 무엇을 하러 왔는지 끊긴다 —
 * 그 순간이 가장 많이 이탈하는 지점이다. 요구("로그인하세요")가 아니라 얻는 것을 말한다.
 */
export const toLoginNotice = (pending: PendingShelf | null): string | null => {
  if (!pending) return null;
  if (pending.books.length > 0) {
    return `로그인하면 고른 ${pending.books.length}권이 내 서재에 바로 꽂혀요.`;
  }
  if (pending.goal) {
    return `로그인하면 ${pending.goal.year}년 목표 ${pending.goal.target}권이 저장돼요.`;
  }
  return null;
};
