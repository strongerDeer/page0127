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
                className='flex h-12 w-full items-end justify-center'
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
    </section>
  );
};
