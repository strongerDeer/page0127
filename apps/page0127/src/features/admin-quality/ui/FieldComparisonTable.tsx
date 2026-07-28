import { rateRumValue, RUM_METRICS } from '@repo/quality/rum';

import type { RumWindow } from '../api/getQualityDashboard';
import type { Verdict } from '../lib/verdict';
import type { RumMetricName, RumRating } from '@repo/quality/rum';
import type { QualityRecord } from '@repo/quality/types';

/**
 * 같은 지표를 세 출처로 나란히 본다 — 자체 RUM / CrUX / Lighthouse.
 *
 * **셋을 한 값으로 합치지 않는다.** 재는 대상이 다르기 때문이다:
 *   - 랩(Lighthouse)은 느린4G·CPU 4x로 조건을 고정한 1회 로드 → 사실상 회선 속도 측정값.
 *     절대 판정에 쓰면 안 되고(회색), 주차 간 상대 비교로만 읽는다.
 *   - CrUX는 실사용자 28일 p75지만 트래픽 임계 미달이면 데이터 자체가 없다.
 *   - 자체 RUM은 우리가 직접 잰 실사용자 값. 표본이 적을 땐 판정을 보류한다.
 *
 * 판단 근거: apps/page0127/docs/rum-field-metrics.md
 */

const METRIC_LABEL: Record<RumMetricName, string> = {
  lcp: 'LCP',
  inp: 'INP',
  cls: 'CLS',
  fcp: 'FCP',
  ttfb: 'TTFB',
};

const CHIP: Record<Verdict, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  fail: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-gray-100 text-gray-500 ring-gray-400/20',
};

const RATING_VERDICT: Record<RumRating, Verdict> = {
  good: 'pass',
  'needs-improvement': 'warn',
  poor: 'fail',
};

const formatValue = (metric: RumMetricName, value: number): string => {
  // CLS는 무단위 누적값이라 ms 포맷을 쓰면 안 된다.
  if (metric === 'cls') return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
};

type CellProps = { verdict: Verdict; label: string; note?: string };

const Cell = ({ verdict, label, note }: CellProps) => (
  <div className='flex flex-col items-start gap-1'>
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP[verdict]}`}
    >
      {label}
    </span>
    {note && <span className='text-[11px] text-text-faint'>{note}</span>}
  </div>
);

const Empty = ({ reason }: { reason: string }) => (
  <span className='text-xs text-text-faint'>{reason}</span>
);

// ── 열별 셀 ──────────────────────────────────────────────────────────────

const RumCell = ({
  metric,
  rum,
}: {
  metric: RumMetricName;
  rum: RumWindow | null;
}) => {
  // null = 조회 실패. "샘플 0건"과 절대 같은 문구를 쓰지 않는다.
  if (!rum) return <Empty reason='조회 실패' />;

  const summary = rum.summaries.find((s) => s.metric === metric);
  if (!summary) {
    // CLS·LCP·INP는 브라우저 지원이 갈린다 — 표본 0이 곧 "빠르다"가 아니다.
    return <Empty reason='수집된 샘플 없음' />;
  }

  const sampleNote = `n=${summary.count}${rum.truncated ? ' (상한 도달)' : ''}`;

  // 표본이 너무 적으면 숫자를 보여주지 않는다. 5건의 p75는 숫자일 뿐 지표가 아니다.
  if (summary.confidence === 'too-few') {
    return <Empty reason={`표본 ${summary.count}건 — 아직 판정 불가`} />;
  }

  return (
    <Cell
      // 'low'(10~29건)는 값은 보여주되 판정 색을 칠하지 않는다 — 방문 한 건이
      // p75를 통째로 흔드는 구간이다.
      verdict={
        summary.confidence === 'ok'
          ? RATING_VERDICT[rateRumValue(metric, summary.p75)]
          : 'neutral'
      }
      label={formatValue(metric, summary.p75)}
      note={
        summary.confidence === 'low' ? `${sampleNote} · 표본 부족` : sampleNote
      }
    />
  );
};

const CruxCell = ({
  metric,
  record,
}: {
  metric: RumMetricName;
  record: QualityRecord;
}) => {
  const field = record.field?.mobile;
  const value = field?.[metric];
  if (value === undefined) {
    return <Empty reason='트래픽 임계 미달' />;
  }
  return (
    <Cell
      verdict={RATING_VERDICT[rateRumValue(metric, value)]}
      label={formatValue(metric, value)}
    />
  );
};

// 랩에 존재하는 지표만. INP는 랩에서 측정 자체가 불가능하고(상호작용이 없다),
// TTFB는 Lighthouse CWV 저장 스키마에 없다.
const LAB_UNAVAILABLE: Partial<Record<RumMetricName, string>> = {
  inp: '측정 불가',
  ttfb: '미수집',
};

const LabCell = ({
  metric,
  record,
}: {
  metric: RumMetricName;
  record: QualityRecord;
}) => {
  const unavailable = LAB_UNAVAILABLE[metric];
  if (unavailable) return <Empty reason={unavailable} />;

  // 홈 앵커 기준. 앵커는 "인기 페이지"가 아니라 회귀 감지용 고정 URL이다.
  const home = record.pages[0];
  const value =
    metric === 'lcp' ? home?.cwv.lcp : metric === 'cls' ? home?.cwv.cls : home?.cwv.fcp;
  if (value === undefined) return <Empty reason='—' />;

  return (
    <Cell
      // 랩 수치는 판정하지 않는다(회색). 느린4G 고정 조건이라 "전송량 ÷ 대역폭"에
      // 정비례하는 값이고, 실사용자가 겪는 시간이 아니다.
      verdict='neutral'
      label={formatValue(metric, value)}
    />
  );
};

// ── 표 ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: 'rum',
    title: '자체 RUM',
    subtitle: '실사용자 · 전 폼팩터 · p75',
  },
  { key: 'crux', title: 'CrUX', subtitle: '실사용자 Chrome · 모바일 · 28일 p75' },
  { key: 'lab', title: 'Lighthouse', subtitle: '랩 · 느린4G 고정 · 홈 중앙값' },
] as const;

export const FieldComparisonTable = ({
  record,
  rum,
}: {
  record: QualityRecord;
  rum: RumWindow | null;
}) => (
  <section className='rounded-lg border border-line p-4'>
    <div className='mb-1 flex items-baseline justify-between gap-2'>
      <h2 className='text-sm font-medium'>핵심 지표 — 출처별 대조</h2>
      <span className='text-xs text-text-faint'>
        자체 RUM 최근 {rum?.windowDays ?? 28}일
      </span>
    </div>
    <p className='mb-3 text-xs text-text-faint'>
      세 열은 <strong>다른 것을 재는 다른 숫자</strong>다. 합치거나 대소를 직접 비교하지
      말 것. 합격/불합격 판정은 실사용자(자체 RUM·CrUX) 값으로만 하고, 랩 수치는 회색
      —주차 간 상대 비교 전용이다.
    </p>

    <div className='overflow-x-auto'>
      <table className='w-full min-w-[520px] border-collapse text-left'>
        <thead>
          <tr className='border-b border-line'>
            <th className='w-20 py-2 text-xs font-medium text-text-faint'>지표</th>
            {COLUMNS.map((column) => (
              <th key={column.key} className='py-2 pr-4'>
                <span className='block text-xs font-medium'>{column.title}</span>
                <span className='block text-[11px] font-normal text-text-faint'>
                  {column.subtitle}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RUM_METRICS.map((metric) => (
            <tr key={metric} className='border-b border-line/50 last:border-0'>
              <th className='py-3 text-xs font-medium'>{METRIC_LABEL[metric]}</th>
              <td className='py-3 pr-4 align-top'>
                <RumCell metric={metric} rum={rum} />
              </td>
              <td className='py-3 pr-4 align-top'>
                <CruxCell metric={metric} record={record} />
              </td>
              <td className='py-3 pr-4 align-top'>
                <LabCell metric={metric} record={record} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className='mt-3 text-[11px] text-text-faint'>
      자체 RUM은 표본을 지키려고 모바일·데스크탑을 합쳐 집계한다. 표본 30건 미만이면 값만
      보여주고 판정 색을 칠하지 않는다. CLS는 Chromium 계열에서만 수집돼 다른 지표보다
      n이 작다.
    </p>
  </section>
);
