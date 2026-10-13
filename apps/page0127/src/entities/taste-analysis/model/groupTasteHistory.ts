import type { TasteAnalysisSummary } from '../types';

export type TasteHistoryRun = {
  personalityType: string;
  count: number;
  /** 묶음에서 가장 오래된 분석 시각 — 뱃지 옆 "7월~" */
  startedAt: string;
  /** 묶음에서 가장 최신 분석 — 주인이 누르면 이 회차 상세로 */
  latestId: string;
};

/**
 * 취향 이력을 "변화"로 보이게 묶는다.
 * 같은 성향이 연달아 나오면 카드가 줄을 서서 아무것도 안 바뀐 것처럼 보였다 → 한 뱃지 + ×N.
 * 입력은 최신순(RPC 순서), 출력은 시간이 흐르는 방향(오래된 → 최신).
 */
export const groupTasteHistory = (
  // 묶는 데 필요한 칸만 받는다 — 방문자용 이력은 분석 권수가 null 이다
  items: Pick<TasteAnalysisSummary, 'id' | 'personality_type' | 'created_at'>[]
): TasteHistoryRun[] =>
  [...items].reverse().reduce<TasteHistoryRun[]>((runs, item) => {
    const last = runs.at(-1);
    if (last && last.personalityType === item.personality_type) {
      last.count += 1;
      last.latestId = item.id;
      return runs;
    }
    runs.push({
      personalityType: item.personality_type,
      count: 1,
      startedAt: item.created_at,
      latestId: item.id,
    });
    return runs;
  }, []);
