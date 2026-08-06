import Link from 'next/link';

import { AlertTriangle } from 'lucide-react';

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
 * 어드민 홈 지표.
 *
 * 순서에 뜻이 있다 — **행동이 필요한 것이 맨 위**다. 미처리 신고는 0 이면
 * 조용히 사라지고, 1 건이라도 있으면 눈에 띄는 배너로 올라온다. 나머지 숫자는
 * 읽고 지나가는 것이고 신고만 손이 필요하다.
 */
export const OverviewCards = ({ overview }: OverviewCardsProps) => {
  const { visitors, members, books, completions } = overview;

  return (
    <div className='space-y-6'>
      {/* 처리할 게 있을 때만 나온다. 0 건일 때 "신고 0건" 카드를 두면
          매일 보는 화면에 아무 의미 없는 줄이 하나 늘어난다 */}
      {overview.pendingReports > 0 && (
        <Link
          href='/admin/reports'
          className='flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 transition-colors hover:bg-destructive/10'
        >
          <AlertTriangle aria-hidden className='size-5 text-destructive' />
          <span className='text-sm font-medium text-destructive'>
            미처리 신고 {overview.pendingReports}건
          </span>
          <span className='ml-auto text-xs text-text-subtle'>확인하기 →</span>
        </Link>
      )}

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
