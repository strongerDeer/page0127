/**
 * 독서 케미 결과를 상대에게 알리기(2026-11-24 HJ A안) — 누가 알릴 수 있고, 누구에게 가는지.
 *
 * 결과는 분석한 사람(requested_by)만 본다. 분석한 사람이 결과 화면에서 "○○ 님에게 알리기"를 누르면
 * shared_at 이 채워지고 상대도 같은 결과를 보며 알림을 받는다. 서버 라우트와 화면이 같은 규칙을 쓴다.
 */
export type ShareableAnalysis = {
  user_id_1: string;
  user_id_2: string;
  requested_by: string | null;
  shared_at: string | null;
};

export type ShareDecision =
  | { kind: 'share'; partnerId: string }
  | { kind: 'already'; partnerId: string }
  | { kind: 'forbidden' };

export const decideShare = (
  analysis: ShareableAnalysis,
  userId: string
): ShareDecision => {
  // 요청자를 모르는 옛 결과는 이미 두 사람 모두 보고 있다 — 알릴 사람을 정할 수 없으니 버튼도 없다
  if (!analysis.requested_by || analysis.requested_by !== userId) {
    return { kind: 'forbidden' };
  }
  const partnerId =
    analysis.user_id_1 === userId ? analysis.user_id_2 : analysis.user_id_1;
  return analysis.shared_at
    ? { kind: 'already', partnerId }
    : { kind: 'share', partnerId };
};

/** 결과 화면에서 보는 사람 입장의 공유 상태 */
export type ShareViewState = 'can-share' | 'shared' | 'received' | 'none';

export const toShareViewState = (
  analysis: ShareableAnalysis,
  viewerId: string
): ShareViewState => {
  if (!analysis.requested_by) return 'none';
  if (analysis.requested_by === viewerId) {
    return analysis.shared_at ? 'shared' : 'can-share';
  }
  return 'received';
};
