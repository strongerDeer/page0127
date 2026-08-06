/**
 * "완독으로 **전환**됐는가" 판정.
 *
 * 이 규칙은 원래 서버 라우트(`PATCH /api/books/[id]`)에만 있었는데, 완독 계측을
 * 붙이면서 클라이언트에도 같은 조건이 필요해졌다. 두 곳에 각각 적으면 한쪽만
 * 고치는 날 활동 기록과 GA 수치가 어긋난다 — 어긋나도 아무도 모른다는 게 더 나쁘다.
 *
 * 핵심은 "지금 완독인가"가 아니라 **"완독이 아니었다가 완독이 됐는가"** 라는 것이다.
 * 전자로 세면 이미 완독한 책의 메모만 고쳐 저장해도 완독이 한 건씩 늘어난다.
 */
export const isNewlyCompleted = (
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined
): boolean => previousStatus !== 'completed' && nextStatus === 'completed';
