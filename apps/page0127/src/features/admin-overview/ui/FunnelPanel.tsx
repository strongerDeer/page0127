import { adminInk } from '@/shared/lib/admin/adminChartColors';

import type { FunnelSummary } from '../lib/funnel';

type FunnelPanelProps = {
  funnel: FunnelSummary;
  periodLabel: string;
};

const pct = (rate: number | null): string =>
  rate === null ? '—' : `${Math.round(rate * 100)}%`;

/** 단계별 띠 색과 그 위 글자색 — 위에서 아래로 블루 → 스카이 → 민트 → 퍼플 */
const BAND = [
  { bg: adminInk.primary, fg: '#ffffff' },
  { bg: adminInk.sky, fg: '#0b2447' },
  { bg: adminInk.mint, fg: '#06302a' },
  { bg: adminInk.violet, fg: '#ffffff' },
] as const;

/** 띠가 너무 좁아지면 글자가 안 들어간다 — 최소 폭 */
const MIN_WIDTH = 0.28;

/** 앞 단계 대비가 가장 낮은 단계 = 가장 많이 빠지는 곳. 첫 단계(가입)는 비교 대상이 없다 */
const worstStepKey = (steps: FunnelSummary['steps']): string | null => {
  let worst: { key: string; rate: number } | null = null;
  for (const s of steps) {
    if (s.ofPrev === null) continue;
    if (!worst || s.ofPrev < worst.rate) worst = { key: s.key, rate: s.ofPrev };
  }
  // 아무도 안 빠졌으면(전부 100%) 강조하지 않는다
  return worst && worst.rate < 1 ? worst.key : null;
};

/**
 * 가입 퍼널 — 깔때기 띠 폭은 가입자 대비, 띠 사이 글씨는 바로 앞 단계 대비.
 * 앞 단계 대비가 가장 낮은 곳이 "가장 많이 빠지는 곳"이라 손볼 화면을 가리킨다.
 */
export const FunnelPanel = ({ funnel, periodLabel }: FunnelPanelProps) => {
  const signups = funnel.steps[0]?.users ?? 0;
  const { activation24h: a } = funnel;
  const worstKey = worstStepKey(funnel.steps);

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
          {/* 깔때기 — 띠 폭 = 가입자 대비, 띠 사이 = 앞 단계에서 몇 % 남았나 (HJ, 2026-11-24) */}
          <ol className='flex flex-col items-center rounded-lg border border-line p-4 lg:col-span-2'>
            {funnel.steps.map((s, i) => {
              const band = BAND[i % BAND.length];
              const worst = s.key === worstKey;
              return (
                <li key={s.key} className='flex w-full flex-col items-center'>
                  {s.ofPrev !== null && (
                    <p className='flex items-center gap-1.5 py-1 text-[11px] text-text-subtle'>
                      <span aria-hidden>↓</span>
                      {worst ? (
                        <span className='rounded-full bg-[#fdf0dc] px-2 py-0.5 font-medium text-[#8a4b00] dark:bg-[#3a2c17] dark:text-[#f0a94c]'>
                          {pct(s.ofPrev)} 남음 · 가장 많이 빠지는 곳
                        </span>
                      ) : (
                        <span>{pct(s.ofPrev)} 남음</span>
                      )}
                    </p>
                  )}
                  <div
                    className='flex h-9 items-center justify-center rounded-md px-2 text-sm font-medium tabular-nums'
                    style={{
                      width: `${Math.max(s.ofSignups ?? 0, MIN_WIDTH) * 100}%`,
                      backgroundColor: band.bg,
                      color: band.fg,
                    }}
                  >
                    <span className='truncate'>
                      {s.label} {s.users}명
                      {i > 0 && (
                        <span className='ml-1 text-xs font-normal opacity-80'>
                          ({pct(s.ofSignups)})
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
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
