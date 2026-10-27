import Link from 'next/link';

import { groupTasteHistory } from '@/entities/taste-analysis/model/groupTasteHistory';
import { getPersonalityColor } from '@/entities/taste-analysis/model/personalityTypes';

import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type TasteHistoryTrailProps = {
  /** 최신순 */
  history: Pick<
    TasteAnalysisSummary,
    'id' | 'personality_type' | 'created_at'
  >[];
  /** 지금 보고 있는 회차 — 그 뱃지를 진하게 */
  currentId: string;
};

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    timeZone: 'Asia/Seoul',
  });

/**
 * 취향의 변화 — 분석 상세 화면 전용.
 * 서재 머리의 취향 카드에 있다가 옮겨 왔다: 명함은 "지금 어떤 독자인가"만 말하고,
 * 어떻게 변해 왔는지는 자세히 들어온 사람에게 보여 준다.
 * 같은 성향이 연달아 나오면 한 뱃지 + ×N (groupTasteHistory).
 */
export const TasteHistoryTrail = ({
  history,
  currentId,
}: TasteHistoryTrailProps) => {
  const runs = groupTasteHistory(history);
  if (runs.length < 2) return null;

  // 지금 회차가 속한 묶음 = 그 회차 시각 이전에 시작한 마지막 묶음 (runs 는 오래된 → 최신)
  const current = history.find((item) => item.id === currentId);
  const currentIndex = current
    ? runs.findLastIndex((run) => run.startedAt <= current.created_at)
    : -1;

  return (
    <ol className='flex flex-wrap items-center gap-1.5 text-sm'>
      {runs.map((run, index) => {
        const isCurrent = index === currentIndex;
        return (
          <li key={run.latestId} className='inline-flex items-center gap-1.5'>
            {index > 0 && (
              <span aria-hidden className='text-text-subtle'>
                →
              </span>
            )}
            <Link
              href={`/dashboard/taste-analysis/${run.latestId}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
                isCurrent
                  ? 'border-line-strong bg-card font-medium text-text-strong'
                  : 'border-line-soft bg-sunken text-text-body hover:border-line-strong'
              }`}
            >
              <span
                aria-hidden
                className='size-2 rounded-full'
                style={{
                  backgroundColor: getPersonalityColor(run.personalityType),
                }}
              />
              {run.personalityType}
              {run.count > 1 && ` ×${run.count}`}
              <span className='text-xs text-text-subtle'>
                {formatMonth(run.startedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
};
