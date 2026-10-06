/**
 * 홈 맨 위 "오늘 볼 것" — 사람이 손을 대야 하는 것만 고른다.
 *
 * 원칙: **0 이면 안 보인다.** "신고 0건"·"회귀 0건" 줄을 매일 보여 주면 정작 1건이 생겼을 때
 * 눈에 안 띈다. 처리할 게 하나도 없으면 "처리할 일 없음" 한 줄만 남긴다.
 */

export type AttentionSources = {
  pendingReports: number;
  /** 가장 최근 품질 측정의 회귀 건수. 측정 기록이 없거나 조회 실패면 null */
  qualityRegressions: number | null;
  /** 이번 달 AI 비용의 예산 대비 %. 조회 실패면 null */
  aiBudgetPercent: number | null;
};

export type AttentionItem = {
  key: string;
  tone: 'danger' | 'warn';
  text: string;
  href: string;
};

/** 이 비율부터 예산을 미리 보게 한다 — 100% 에서 알면 이미 넘은 뒤다 */
export const AI_BUDGET_WARN_PERCENT = 80;

export const buildAttention = (s: AttentionSources): AttentionItem[] => {
  const items: AttentionItem[] = [];

  if (s.pendingReports > 0) {
    items.push({
      key: 'reports',
      tone: 'danger',
      text: `미처리 신고 ${s.pendingReports}건`,
      href: '/admin/reports',
    });
  }
  if (s.qualityRegressions !== null && s.qualityRegressions > 0) {
    items.push({
      key: 'quality',
      tone: 'warn',
      text: `최근 품질 측정에서 나빠진 항목 ${s.qualityRegressions}건`,
      href: '/admin/quality',
    });
  }
  if (
    s.aiBudgetPercent !== null &&
    s.aiBudgetPercent >= AI_BUDGET_WARN_PERCENT
  ) {
    items.push({
      key: 'ai',
      tone: s.aiBudgetPercent >= 100 ? 'danger' : 'warn',
      text: `이번 달 AI 비용이 예산의 ${s.aiBudgetPercent}%`,
      href: '/admin/costs',
    });
  }
  return items;
};
