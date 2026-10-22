import type { Ratio, RetentionSummary } from '../lib/retention';

type RetentionPanelProps = {
  retention: RetentionSummary;
  /** 기간 표기 — '최근 30일' */
  periodLabel: string;
};

const pct = (rate: number | null): string =>
  rate === null ? '—' : `${Math.round(rate * 100)}%`;

/** 표본이 작을 때 비율만 보면 "1명 중 1명 = 100%"에 속는다 — 분자/분모를 같이 적는다 */
const RatioCell = ({ r }: { r: Ratio }) => (
  <td className='px-2 py-1.5 text-right tabular-nums'>
    {r.eligible === 0 ? (
      <span className='text-text-subtle' title='창이 아직 안 끝나 판정 전'>
        집계 중
      </span>
    ) : (
      <>
        {pct(r.rate)}{' '}
        <span className='text-xs text-text-subtle'>
          ({r.retained}/{r.eligible})
        </span>
      </>
    )}
  </td>
);

type TileProps = { label: string; value: string; hint: string };

const Tile = ({ label, value, hint }: TileProps) => (
  <div className='rounded-lg border border-line p-4'>
    <p className='text-xs text-text-subtle'>{label}</p>
    <p className='mt-1 text-2xl font-bold tabular-nums text-text-strong'>
      {value}
    </p>
    <p className='mt-0.5 text-xs text-text-subtle'>{hint}</p>
  </div>
);

/**
 * D-2 재방문 — "들어온 사람이 다시 오나?"를 두 각도로 본다.
 * 위 타일은 기간 전체 방문자 기준, 아래 표는 기간 안에 가입한 사람(코호트) 기준이다.
 */
export const RetentionPanel = ({
  retention: r,
  periodLabel,
}: RetentionPanelProps) => (
  <section>
    <h2 className='mb-3 text-sm font-medium'>
      재방문{' '}
      <span className='font-normal text-text-subtle'>
        ({periodLabel} · 로그인 사용자 · 운영자 제외)
      </span>
    </h2>

    {r.beforeLogStart && (
      <p className='mb-3 text-xs text-text-subtle'>
        방문 기록은 2026-07-29부터 쌓였습니다. 그 전 날짜는 비어 있는 것이
        정상입니다.
      </p>
    )}

    <div className='grid gap-3 sm:grid-cols-3'>
      <Tile
        label='순 방문자'
        value={`${r.activeUsers.toLocaleString('ko-KR')}명`}
        hint='기간 안에 하루라도 들어온 사람'
      />
      <Tile
        label='재방문율'
        value={pct(r.returningRate)}
        hint={`${r.returningUsers}명이 서로 다른 2일 이상 방문 · 같은 길이 기간끼리 비교`}
      />
      <Tile
        label='평균 방문일'
        value={r.avgVisitDays === null ? '—' : `${r.avgVisitDays.toFixed(1)}일`}
        hint='순 방문자 1명이 기간 중 들어온 날 수'
      />
    </div>

    <div className='mt-3 overflow-x-auto rounded-lg border border-line p-4'>
      <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
        <div className='text-sm font-medium'>가입 코호트</div>
        <span className='text-xs text-text-subtle'>
          D1 다음 날 · W1 1~7일째 · W4 22~28일째에 다시 온 비율 (가입 당일 제외)
        </span>
      </div>
      {r.total.signups === 0 ? (
        <p className='py-4 text-center text-sm text-text-subtle'>
          이 기간에 가입한 사람이 없습니다.
        </p>
      ) : (
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-line text-xs text-text-subtle'>
              <th className='px-2 py-1.5 text-left font-normal'>가입 주</th>
              <th className='px-2 py-1.5 text-right font-normal'>가입</th>
              <th className='px-2 py-1.5 text-right font-normal'>D1</th>
              <th className='px-2 py-1.5 text-right font-normal'>W1</th>
              <th className='px-2 py-1.5 text-right font-normal'>W4</th>
            </tr>
          </thead>
          <tbody>
            {r.cohorts.map((c) => (
              <tr key={c.weekStart} className='border-b border-line/60'>
                <td className='px-2 py-1.5'>{c.label}</td>
                <td className='px-2 py-1.5 text-right tabular-nums'>
                  {c.signups}명
                </td>
                <RatioCell r={c.d1} />
                <RatioCell r={c.w1} />
                <RatioCell r={c.w4} />
              </tr>
            ))}
            <tr className='font-medium'>
              <td className='px-2 py-1.5'>합계</td>
              <td className='px-2 py-1.5 text-right tabular-nums'>
                {r.total.signups}명
              </td>
              <RatioCell r={r.total.d1} />
              <RatioCell r={r.total.w1} />
              <RatioCell r={r.total.w4} />
            </tr>
          </tbody>
        </table>
      )}
    </div>
  </section>
);
