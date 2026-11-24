import { Sparkline } from '@/shared/ui/AdminSparkline';

import type { AdminOverview } from '@/features/admin-overview/api/getOverview';

type OverviewCardsProps = {
  overview: AdminOverview;
};

type MetricProps = {
  label: string;
  /** 숫자 또는 미리 다듬은 문자열('23%', '3 / 10명'). null 이면 조회 실패 */
  value: number | string | null;
  /** 값 아래 한 줄. 단위나 기준을 밝힌다 */
  hint?: string;
  /** 숫자 옆 ▲▼ — 지금 값 − 앞 값. 이름은 접근성 문구에 쓴다 (예: '그제') */
  delta?: { diff: number; against: string };
  /** 카드 아래 작은 추세선 */
  spark?: { values: number[]; label: string };
};

/** ▲ 3 / ▼ 2 / ― 0 — 색은 오르면 민트, 내리면 빨강 대신 퍼플(경고가 아니라 변화라서) */
const Delta = ({ diff, against }: { diff: number; against: string }) => {
  const up = diff > 0;
  const down = diff < 0;
  return (
    <span
      className={`ml-2 text-xs font-medium tabular-nums ${
        up
          ? 'text-[#0f9e74] dark:text-[#34d399]'
          : down
            ? 'text-[#6a49ee] dark:text-[#a993f7]'
            : 'text-text-subtle'
      }`}
      title={`${against} 대비`}
    >
      <span aria-hidden>{up ? '▲' : down ? '▼' : '―'}</span>
      <span className='sr-only'>{`${against} 대비 ${up ? '증가' : down ? '감소' : '같음'}`}</span>{' '}
      {Math.abs(diff)}
    </span>
  );
};

const Metric = ({ label, value, hint, delta, spark }: MetricProps) => (
  <div className='rounded-lg border border-line p-4'>
    <p className='text-xs text-text-subtle'>{label}</p>
    {/* tabular-nums: 숫자가 바뀌어도 자리가 흔들리지 않는다 */}
    <p className='mt-1 flex items-baseline text-2xl font-bold tabular-nums text-text-strong'>
      {value === null
        ? '—'
        : typeof value === 'number'
          ? value.toLocaleString('ko-KR')
          : value}
      {value !== null && delta && <Delta {...delta} />}
    </p>
    {hint && <p className='mt-0.5 text-xs text-text-subtle'>{hint}</p>}
    {spark && <Sparkline values={spark.values} label={spark.label} />}
  </div>
);

/** 섹션 제목 옆에 "어디서 온 숫자인지"를 붙인다 — 유입분석(GA)의 '사용자'와 헷갈리지 않게 */
const SourceTag = ({ children }: { children: string }) => (
  <span className='ml-1.5 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-normal text-text-subtle'>
    {children}
  </span>
);

const pct = (ratio: number | null): string | null =>
  ratio === null ? null : `${Math.round(ratio * 100)}%`;

/**
 * 어드민 홈 지표 — 읽고 지나가는 숫자.
 * 손이 필요한 것(미처리 신고 등)은 위쪽 AttentionList 가 따로 맡는다.
 *
 * 베타(회원 수십 명)에서는 "어제 가입 0·등록 0"이 흔해서 어제 숫자만 크게 두면 매일 빈 화면이 된다.
 * 그래서 큰 숫자는 활성 사용자와 **사람 단위 현황**으로 두고, 어제 증감은 힌트로 내린다.
 */
export const OverviewCards = ({ overview }: OverviewCardsProps) => {
  const { activity, beta, members, books, completions } = overview;

  return (
    <div className='space-y-6'>
      <section>
        <h2 className='mb-3 text-sm font-medium'>
          활성 사용자{' '}
          <span className='font-normal text-text-subtle'>
            ({overview.yesterday}까지)
          </span>
          <SourceTag>로그인 회원 · 운영자 제외</SourceTag>
        </h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <Metric
            label='DAU (어제)'
            value={activity?.dau ?? null}
            hint={activity ? `오늘 ${activity.today}명 (진행 중)` : undefined}
            delta={
              activity
                ? { diff: activity.dau - activity.prevDau, against: '그제' }
                : undefined
            }
            spark={
              activity
                ? { values: activity.dauSeries, label: '최근 14일 DAU' }
                : undefined
            }
          />
          <Metric
            label='WAU (최근 7일)'
            value={activity?.wau ?? null}
            hint='7일 안에 하루라도 온 사람'
            delta={
              activity
                ? {
                    diff: activity.wau - activity.prevWau,
                    against: '그 전 7일',
                  }
                : undefined
            }
          />
          <Metric
            label='MAU (최근 30일)'
            value={activity?.mau ?? null}
            hint='30일 안에 하루라도 온 사람'
          />
          <Metric
            label='고착도'
            value={pct(activity?.stickiness ?? null)}
            hint={
              activity?.stickiness != null
                ? `30일 중 평균 ${(activity.stickiness * 30).toFixed(1)}일 방문`
                : '평균 DAU ÷ MAU'
            }
          />
        </div>
      </section>

      <section>
        <h2 className='mb-3 text-sm font-medium'>
          베타 현황
          <SourceTag>운영자 제외</SourceTag>
        </h2>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          <Metric
            label='회원'
            value={beta?.members ?? null}
            hint={`어제 가입 ${members.yesterday}명`}
          />
          <Metric
            label='책을 넣은 회원'
            value={beta ? `${beta.withBooks} / ${beta.members}명` : null}
            hint='1권 이상 등록'
          />
          <Metric
            label='최근 3일 안 온 회원'
            value={beta ? `${beta.idle}명` : null}
            hint='가입 3일 지난 사람 중 · 회원 화면에서 누군지 확인'
          />
          <Metric
            label='알림 켠 회원'
            value={beta ? `${beta.withPush} / ${beta.members}명` : null}
            hint='아이폰은 홈 화면에 설치해야 켤 수 있어요'
          />
          <Metric
            label='등록된 책'
            value={books.total}
            hint={`어제 +${books.yesterday}권 · 완독 ${completions.yesterday}권`}
          />
        </div>
      </section>
    </div>
  );
};
