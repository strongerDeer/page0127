/**
 * 팔로워·팔로잉 목록("누가 누구를")은 본인만 본다 (2026-11-23).
 *
 * 숫자(user_follow_stats)는 공개, 명단은 비공개.
 * 남의 팔로워 목록을 열 수 있으면 그 사람을 팔로우한 **나까지** 낯선 사람에게 노출된다.
 * 그래서 개인별 숨김 설정이 아니라 서비스 전체 정책으로 막는다.
 *
 * 같은 규칙이 DB 에도 있다(follows RLS: 내가 낀 행만). 이 검사는 그 위의 한 겹 —
 * RLS 만 있으면 남의 목록 요청이 "빈 목록 200"으로 돌아가 원인을 알기 어렵고,
 * 여기서 먼저 403 으로 끊으면 의도가 코드와 응답에 드러난다.
 */
export type FollowListAccess = 'ok' | 'unauthorized' | 'forbidden';

export const checkFollowListAccess = (
  viewerId: string | null | undefined,
  ownerId: string
): FollowListAccess => {
  if (!viewerId) return 'unauthorized';
  return viewerId === ownerId ? 'ok' : 'forbidden';
};
