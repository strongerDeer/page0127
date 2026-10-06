import type { AdminOverview } from '@/features/admin-overview/api/getOverview';

type OverviewCardsProps = {
  overview: AdminOverview;
};

type MetricProps = {
  label: string;
  value: number;
  /** 값 아래 한 줄. 단위나 기준을 밝힌다 */
  hint?: string;
};

const Metric = ({ label, value, hint }: MetricProps) => (
  <div className='rounded-lg border border-line p-4'>
    <p className='text-xs text-text-subtle'>{label}</p>
    {/* tabular-nums: 숫자가 바뀌어도 자리가 흔들리지 않는다 */}
    <p className='mt-1 text-2xl font-bold tabular-nums text-text-strong'>
      {value.toLocaleString('ko-KR')}
    </p>
    {hint && <p className='mt-0.5 text-xs text-text-subtle'>{hint}</p>}
  </div>
);

/**
 * 어드민 홈 지표 — 읽고 지나가는 숫자.
 * 손이 필요한 것(미처리 신고 등)은 위쪽 AttentionList 가 따로 맡는다.
 */
export const OverviewCards = ({ overview }: OverviewCardsProps) => {
  const { visitors, members, books, completions } = overview;

  return (
    <div className='space-y-6'>
      <section>
        <h2 className='mb-3 text-sm font-medium'>
          어제{' '}
          <span className='font-normal text-text-subtle'>
            ({overview.yesterday} 기준)
          </span>
        </h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <Metric
            label='방문자'
            value={visitors.yesterday}
            hint={`오늘 ${visitors.today}명 (진행 중)`}
          />
          <Metric label='가입' value={members.yesterday} />
          <Metric label='등록된 책' value={books.yesterday} />
          <Metric label='완독' value={completions.yesterday} />
        </div>
      </section>

      <section>
        <h2 className='mb-3 text-sm font-medium'>누적</h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <Metric label='회원' value={members.total} />
          <Metric label='책' value={books.total} />
          <Metric
            label='최근 7일 방문'
            value={visitors.last7Days}
            hint='연인원 (같은 사람이 3일 오면 3)'
          />
        </div>
      </section>
    </div>
  );
};
