type GoalDemoProps = { goalRatio: number };

const TARGET = 12;
const DONE = 7;
/** 1~9월 완독 막대 높이(비율). 10~12월은 아직 오지 않은 달 */
const MONTHS = [0.3, 0.55, 0, 0.7, 0.45, 0.15, 0.9, 0.4, 0.6] as const;

/**
 * ② 목표 — 링이 7/12권까지 차고 달별 막대가 차례로 솟는다.
 * 인라인 style 은 진행도에 따라 매 프레임 바뀌는 연속값(링 각도·막대 높이)에만 쓴다.
 */
export const GoalDemo = ({ goalRatio }: GoalDemoProps) => {
  const done = Math.round(DONE * goalRatio);

  return (
    <div className='grid grid-cols-1 items-center gap-6 rounded-2xl bg-sunken p-5 md:grid-cols-[140px_1fr]'>
      <div
        className='mx-auto hidden size-36 place-items-center rounded-full md:grid'
        style={{
          background: `conic-gradient(var(--primary) ${(done / TARGET) * 360}deg, var(--card) 0)`,
        }}
      >
        <div className='grid size-28 place-items-center rounded-full bg-sunken text-center'>
          <p className='text-3xl font-bold text-text-strong'>
            {done}
            <span className='block text-xs font-normal text-text-subtle'>
              / {TARGET}권
            </span>
          </p>
        </div>
      </div>
      <div>
        <p className='text-base font-bold text-text-strong'>올해 독서 목표</p>
        <div aria-hidden='true' className='mt-3 flex h-24 items-end gap-1.5'>
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-t-sm ${i < MONTHS.length ? 'bg-primary' : 'bg-card'}`}
              style={{
                height: `${(MONTHS[i] ?? 0.06) * 100 * Math.min(1, Math.max(0, goalRatio * 1.6 - i * 0.07))}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
