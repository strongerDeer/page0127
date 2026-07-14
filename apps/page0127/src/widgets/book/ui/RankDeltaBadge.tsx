import { ChevronDown, ChevronUp, Minus } from 'lucide-react';

/**
 * 순위 변동 뱃지 — ▲12 / ▼3 / NEW / −
 *
 * 이 숫자는 **어제의 랭킹이 DB에 남아 있어야만** 계산된다.
 * 즉 화면에 이게 떠 있다는 것 자체가 "매일 집계가 돌고 있다"는 증거다.
 * AI가 만든 목업은 이 값을 가질 수 없다. (00_docs/07 §1.3-①)
 *
 * 정직하게 그리는 규칙:
 * - has_history=false → **아무것도 그리지 않는다.**
 *   스냅샷이 하루도 안 쌓였는데 전부 NEW로 칠하면 거짓말이 된다.
 * - 이력은 있는데 이 책이 없었다 → NEW
 * - delta === 0 → 변동 없음(−). 숨기지 않는다. 유지도 정보다.
 */
type RankDeltaBadgeProps = {
  delta?: number | null;
  isNew?: boolean;
  hasHistory?: boolean;
};

export const RankDeltaBadge = ({
  delta,
  isNew,
  hasHistory,
}: RankDeltaBadgeProps) => {
  // 비교할 과거가 없다 — 침묵한다
  if (!hasHistory) return null;

  if (isNew) {
    return (
      <span className='inline-flex items-center rounded-sm border border-rank-up px-1 text-[10px] font-bold leading-4 text-rank-up'>
        NEW
      </span>
    );
  }

  if (delta === null || delta === undefined) return null;

  if (delta === 0) {
    return (
      <span
        className='inline-flex items-center gap-0.5 text-[11px] text-text-faint'
        title='순위 변동 없음'
      >
        <Minus className='h-3 w-3' aria-hidden />
        <span className='sr-only'>순위 변동 없음</span>
      </span>
    );
  }

  const isUp = delta > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        isUp ? 'text-rank-up' : 'text-text-faint'
      }`}
    >
      {isUp ? (
        <ChevronUp className='h-3 w-3' aria-hidden />
      ) : (
        <ChevronDown className='h-3 w-3' aria-hidden />
      )}
      {Math.abs(delta)}
      <span className='sr-only'>
        어제보다 {Math.abs(delta)}계단 {isUp ? '상승' : '하락'}
      </span>
    </span>
  );
};
