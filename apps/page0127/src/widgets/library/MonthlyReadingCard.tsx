type MonthlyReadingCardProps = {
  year: number;
  /** 달마다 완독 권수 — 1월부터 12개 */
  counts: readonly number[];
  /** 아래 캘린더가 지금 보는 달 — 다른 해를 보고 있으면 없음 */
  selectedMonth?: number;
  /** 이번 달 — 올해를 볼 때만 민트로 표시 */
  thisMonth?: number;
  /** 막대를 누르면 캘린더를 그 달로 */
  onSelect: (month: number) => void;
};

/**
 * 월별 완독 — 달마다 완독 권수를 막대 12개로. 기록 묶음에서 평점 분포와 나란히 둔다.
 *
 * 처음엔 캘린더 머리에 붙였는데(PR #417), "1년 통계"가 "한 달 달력" 안에 들어가
 * 달력과 한 덩어리로 읽혔다 → 캘린더 밖, 한 해 숫자 요약인 평점 분포 옆으로 뺐다(HJ, 2026-11-12).
 * 막대는 그대로 버튼이라 누르면 위 캘린더가 그 달로 넘어간다(상태는 ReadingRecord 가 들고 있다).
 * 막대 높이는 그 해 가장 많이 읽은 달을 100% 로 둔 비율이다.
 *
 * 카드는 평점 분포 옆 그리드 칸이라 그 높이만큼 늘어난다(grid 기본 align-items: stretch).
 * 막대만 두면 아래가 비어서, 막대를 키우고 남는 아래에 한 해 요약 숫자 3칸을 붙였다(HJ B안, 2026-11-16).
 * 요약 칸은 mt-auto 로 카드 바닥에 붙어 옆 카드의 인생책 칸과 높이가 맞는다.
 */
export const MonthlyReadingCard = ({
  year,
  counts,
  selectedMonth,
  thisMonth,
  onSelect,
}: MonthlyReadingCardProps) => {
  const max = Math.max(1, ...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const summary = summarizeMonths(counts, thisMonth);

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex items-baseline justify-between'>
        <h2 className='text-base font-bold text-text-strong'>월별 완독</h2>
        <span className='text-xs text-text-subtle'>
          {year}년 {total}권
        </span>
      </div>

      <div className='grid grid-cols-12 gap-0.5'>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const count = counts[m - 1] ?? 0;
          const isOn = m === selectedMonth;
          const barColor = isOn
            ? 'bg-primary'
            : m === thisMonth
              ? 'bg-[var(--teal-500)]'
              : 'bg-primary/30';
          return (
            <button
              key={m}
              type='button'
              data-month-bar
              onClick={() => onSelect(m)}
              aria-pressed={isOn}
              aria-label={`${m}월, ${count}권 — 캘린더에서 보기`}
              className={`flex flex-col items-center gap-1 rounded-md px-0.5 pb-1 pt-1.5 ${
                isOn ? 'bg-sunken' : 'hover:bg-sunken'
              }`}
            >
              <span
                aria-hidden
                className='h-3 text-[10px] leading-3 tabular-nums text-text-subtle'
              >
                {count > 0 ? count : ''}
              </span>
              <span
                aria-hidden
                className='flex h-24 w-full items-end justify-center sm:h-28'
              >
                <span
                  className={`w-full max-w-4 rounded-t-sm ${count > 0 ? barColor : 'bg-line-soft'}`}
                  style={{
                    height:
                      count > 0 ? `${Math.max(10, (count / max) * 100)}%` : 2,
                  }}
                />
              </span>
              <span
                aria-hidden
                className={`text-xs ${isOn ? 'font-bold text-text-strong' : 'text-text-subtle'}`}
              >
                {m}
              </span>
            </button>
          );
        })}
      </div>

      <dl className='mt-auto grid grid-cols-3 gap-2'>
        <SummaryTile
          label='가장 많이 읽은 달'
          value={summary.peak}
          unit={summary.peakUnit}
        />
        <SummaryTile label='월 평균' value={summary.average} unit='권' />
        {thisMonth ? (
          <SummaryTile
            label='이번 달'
            dot
            value={String(counts[thisMonth - 1] ?? 0)}
            unit={
              thisMonth > 1
                ? `권 · 지난달 ${counts[thisMonth - 2] ?? 0}권`
                : '권'
            }
          />
        ) : (
          <SummaryTile
            label='책을 읽은 달'
            value={String(summary.activeMonths)}
            unit='개월'
          />
        )}
      </dl>
    </section>
  );
};

type SummaryTileProps = {
  label: string;
  value: string;
  unit?: string;
  /** 이번 달 막대와 같은 민트 점 — 면이 아니라 점으로만 잇는다 */
  dot?: boolean;
};

const SummaryTile = ({ label, value, unit, dot }: SummaryTileProps) => (
  <div className='min-w-0 rounded-xl bg-sunken px-3 py-2.5'>
    <dt className='flex items-start gap-1 break-keep text-[11px] leading-4 text-text-subtle sm:text-xs'>
      {dot && (
        <span
          aria-hidden
          className='mt-[5px] size-1.5 shrink-0 rounded-full bg-[var(--teal-500)]'
        />
      )}
      {label}
    </dt>
    <dd className='mt-1 text-base font-bold tabular-nums text-text-strong sm:text-lg'>
      {value}
      {unit && (
        <span className='block break-keep text-[11px] font-normal leading-4 text-text-subtle sm:ml-1 sm:inline sm:text-xs'>
          {unit}
        </span>
      )}
    </dd>
  </div>
);

/**
 * 요약 숫자 — 렌더와 떼어 둔 순수 함수라 테스트하기 쉽다.
 * 월 평균은 올해면 이번 달까지만 나눈다(아직 안 온 달까지 12로 나누면 평균이 실제보다 낮아 보인다).
 */
export const summarizeMonths = (
  counts: readonly number[],
  thisMonth?: number
) => {
  const months = counts.slice(0, 12);
  const top = Math.max(0, ...months);
  const peakMonths = months.flatMap((count, i) =>
    top > 0 && count === top ? [i + 1] : []
  );
  const elapsed = thisMonth ?? 12;
  const total = months.slice(0, elapsed).reduce((sum, count) => sum + count, 0);
  const average = Math.round((total / elapsed) * 10) / 10;

  return {
    // 셋 넘게 같으면 다 적기엔 칸이 좁다 → 앞의 둘 + "외"
    peak:
      peakMonths.length === 0
        ? '—'
        : peakMonths.length > 2
          ? `${peakMonths.slice(0, 2).join('·')}월 외`
          : `${peakMonths.join('·')}월`,
    peakUnit: top > 0 ? `${top}권` : undefined,
    average: String(average),
    activeMonths: months.filter((count) => count > 0).length,
  };
};
