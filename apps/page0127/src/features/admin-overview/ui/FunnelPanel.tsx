import { chartInk } from '@/shared/lib/chartStyles';

import type { FunnelSummary } from '../lib/funnel';

type FunnelPanelProps = {
  funnel: FunnelSummary;
  periodLabel: string;
};

const pct = (rate: number | null): string =>
  rate === null ? '—' : `${Math.round(rate * 100)}%`;

/**
 * 가입 퍼널 — 막대 길이는 가입자 대비, 오른쪽 작은 글씨는 바로 앞 단계 대비.
 * 앞 단계 대비가 가장 낮은 곳이 "가장 많이 빠지는 곳"이라 손볼 화면을 가리킨다.
 */
export const FunnelPanel = ({ funnel, periodLabel }: FunnelPanelProps) => {
  const signups = funnel.steps[0]?.users ?? 0;
  const { activation24h: a } = funnel;

  return (
    <section>
      <h2 className='mb-3 text-sm font-medium'>
        가입 퍼널{' '}
        <span className='font-normal text-text-subtle'>
          ({periodLabel} 가입자 · 운영자 제외 · 지금까지 한 번이라도)
        </span>
      </h2>

      {signups === 0 ? (
        <p className='rounded-lg border border-line p-4 text-center text-sm text-text-subtle'>
          이 기간에 가입한 사람이 없습니다.
        </p>
      ) : (
        <div className='grid gap-3 lg:grid-cols-3'>
          <ol className='space-y-2 rounded-lg border border-line p-4 lg:col-span-2'>
            {funnel.steps.map((s) => (
              <li key={s.key}>
                <div className='flex items-baseline justify-between gap-2 text-sm'>
                  <span>{s.label}</span>
                  <span className='tabular-nums'>
                    {s.users}명{' '}
                    <span className='text-xs text-text-subtle'>
                      {pct(s.ofSignups)}
                      {s.ofPrev !== null && ` · 앞 단계의 ${pct(s.ofPrev)}`}
                    </span>
                  </span>
                </div>
                <div className='mt-1 h-1.5 rounded-full bg-line/50'>
                  <div
                    className='h-1.5 rounded-full'
                    style={{
                      width: `${(s.ofSignups ?? 0) * 100}%`,
                      // 유입분석 ShareBars 와 같은 차트 공용 색
                      backgroundColor: chartInk.primary,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
          <div className='rounded-lg border border-line p-4'>
            <p className='text-xs text-text-subtle'>24시간 안 첫 책</p>
            <p className='mt-1 text-2xl font-bold tabular-nums text-text-strong'>
              {pct(a.rate)}
            </p>
            <p className='mt-0.5 text-xs text-text-subtle'>
              {a.eligible === 0
                ? '가입 후 24시간이 지난 사람이 아직 없습니다'
                : `${a.eligible}명 중 ${a.activated}명 · 가입 직후 서재를 채웠나`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
