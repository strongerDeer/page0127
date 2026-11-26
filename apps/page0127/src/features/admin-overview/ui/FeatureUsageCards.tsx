import { adminInk } from '@/shared/lib/admin/adminChartColors';

import { SENTENCE_STEPS, TYPING_STEPS } from '../lib/featureUsage';

import type { FeatureUsage } from '../api/getFeatureUsage';
import type { TrendPoint } from '../lib/trend';

/** GA 이벤트별 횟수·사용자 — admin-analytics 의 EventTotals 와 같은 모양(feature 끼리 import 하지 않으려고 따로 적는다) */
type GaTotals = Record<string, { count: number; users: number }>;

const n = (v: number) => v.toLocaleString('ko-KR');

const Kpi = ({ value, label }: { value: string; label: string }) => (
  <div className='min-w-0'>
    <p className='text-xl font-medium tabular-nums'>{value}</p>
    <p className='text-xs text-text-subtle'>{label}</p>
  </div>
);

/** GA 깔때기 — 첫 단계 사용자 수를 100% 로 본 가로 막대 */
const GaFunnel = ({
  steps,
  totals,
  color,
}: {
  steps: { name: string; label: string }[];
  totals: GaTotals | null;
  color: string;
}) => {
  if (!totals) {
    return (
      <p className='text-xs text-text-subtle'>GA 숫자를 불러오지 못했어요.</p>
    );
  }
  const base = Math.max(1, totals[steps[0].name]?.users ?? 0);
  return (
    <ul className='space-y-1.5 text-sm'>
      {steps.map((s) => {
        const t = totals[s.name] ?? { count: 0, users: 0 };
        const pct = Math.min(100, Math.round((t.users / base) * 100));
        return (
          <li
            key={s.name}
            className='grid grid-cols-[5.5rem_1fr_7rem] items-center gap-2'
          >
            <span className='truncate'>{s.label}</span>
            <span className='h-3 rounded-sm bg-line/60'>
              <span
                className='block h-full rounded-sm'
                style={{
                  width: `${t.users > 0 ? Math.max(pct, 2) : 0}%`,
                  backgroundColor: color,
                }}
              />
            </span>
            <span className='text-right tabular-nums text-xs text-text-subtle'>
              <span className='text-sm text-text-strong'>{n(t.users)}명</span> ·{' '}
              {n(t.count)}회
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/** 날짜별 작은 막대 — 기간이 길어도 한 줄에 들어가게 칸 폭을 나눠 쓴다 */
const DailyBars = ({
  points,
  color,
  unit,
}: {
  points: TrendPoint[];
  color: string;
  unit: string;
}) => {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div>
      <div
        className='flex h-14 items-end gap-px'
        role='img'
        aria-label={`날짜별 ${unit}`}
      >
        {points.map((p) => (
          <span
            key={p.date}
            title={`${p.label} · ${p.count}${unit}`}
            className='min-w-0 flex-1 rounded-t-[2px]'
            style={{
              height: `${p.count > 0 ? Math.max((p.count / max) * 100, 6) : 2}%`,
              backgroundColor: p.count > 0 ? color : 'var(--color-line)',
            }}
          />
        ))}
      </div>
      <div className='mt-1 flex justify-between text-[10px] text-text-subtle'>
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
};

const Card = ({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) => (
  <div className='min-w-0 space-y-4 rounded-lg border border-line p-4'>
    <div className='flex items-baseline justify-between gap-2'>
      <h3 className='text-sm font-medium'>{title}</h3>
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-xs text-text-subtle underline'
      >
        페이지 열기
      </a>
    </div>
    {children}
  </div>
);

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <p className='mb-1.5 text-xs text-text-subtle'>{children}</p>
);

const Failed = () => (
  <p className='text-xs text-text-subtle'>
    DB 숫자를 불러오지 못했어요. (0건과는 다른 상태예요)
  </p>
);

/**
 * 새 기능은 잘 쓰이나? — 오늘의 문장·온라인 필사(HJ 2026-11-26 B안).
 * 위는 DB(정확, 회원 중심), 아래는 GA(비회원 포함, 광고 차단은 빠짐) 깔때기.
 */
export const FeatureUsageCards = ({
  usage,
  ga,
  periodLabel,
}: {
  usage: FeatureUsage;
  ga: GaTotals | null;
  periodLabel: string;
}) => (
  <section>
    <h2 className='mb-3 text-sm font-medium'>
      새 기능은 잘 쓰이나?{' '}
      <span className='font-normal text-text-subtle'>
        ({periodLabel} · 운영자 제외)
      </span>
    </h2>
    <div className='grid gap-3 lg:grid-cols-2'>
      <Card title='오늘의 문장' href='/sentence'>
        {usage.sentence ? (
          <>
            <div className='grid grid-cols-2 gap-3'>
              <Kpi
                value={`${n(usage.sentence.draws)}번`}
                label='회원 뽑기 (DB)'
              />
              <Kpi value={`${n(usage.sentence.drawers)}명`} label='뽑은 회원' />
            </div>
            <DailyBars
              points={usage.sentence.daily}
              color={adminInk.primary}
              unit='번'
            />
          </>
        ) : (
          <Failed />
        )}
        <div>
          <SubLabel>GA · 비회원 포함</SubLabel>
          <GaFunnel
            steps={SENTENCE_STEPS}
            totals={ga}
            color={adminInk.primary}
          />
        </div>
      </Card>

      <Card title='어린 왕자 온라인 필사' href='/typing/little-prince'>
        {usage.typing ? (
          <>
            <div className='grid grid-cols-3 gap-3'>
              <Kpi
                value={`${n(usage.typing.newPages)}쪽`}
                label={`회원이 새로 쓴 쪽 · ${n(usage.typing.writers)}명`}
              />
              <Kpi
                value={`${n(usage.typing.guestScores)}건`}
                label={`비회원 랭킹 기록 · ${n(usage.typing.guestWriters)}명`}
              />
              <Kpi
                value={`${n(usage.typing.rankOptIn)}명`}
                label='순위 참여 회원 (누적)'
              />
            </div>
            <DailyBars
              points={usage.typing.daily}
              color={adminInk.violet}
              unit='쪽'
            />
          </>
        ) : (
          <Failed />
        )}
        <div>
          <SubLabel>GA · 비회원 포함 · 첫 단계 사람 수 기준</SubLabel>
          <GaFunnel steps={TYPING_STEPS} totals={ga} color={adminInk.violet} />
        </div>
      </Card>
    </div>
  </section>
);
