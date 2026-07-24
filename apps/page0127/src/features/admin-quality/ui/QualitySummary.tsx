import { type Verdict,verdict } from '../lib/verdict';

import type { QualityRecord } from '@repo/quality/types';

// 판정 → 클래스. neutral은 회색(랩 LCP 등 "판정 제외").
const CHIP: Record<Verdict, string> = {
  pass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  fail: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-gray-100 text-gray-500 ring-gray-400/20',
};

const Chip = ({ v, label }: { v: Verdict; label: string }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP[v]}`}
    >
      {label}
    </span>
  );
}

export const QualitySummary = ({ record }: { record: QualityRecord }) => {
  const field = record.field?.mobile;
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>실사용자 핵심 지표 (모바일)</h2>
      {field ? (
        <div className='flex flex-wrap gap-2'>
          {field.lcp != null && (
            <Chip
              v={verdict('fieldLcpP75', field.lcp, 'mobile')}
              label={`LCP ${Math.round(field.lcp)}ms`}
            />
          )}
          {field.inp != null && (
            <Chip
              v={verdict('fieldInpP75', field.inp, 'mobile')}
              label={`INP ${Math.round(field.inp)}ms`}
            />
          )}
          {field.cls != null && (
            <Chip
              v={verdict('fieldClsP75', field.cls, 'mobile')}
              label={`CLS ${field.cls.toFixed(2)}`}
            />
          )}
        </div>
      ) : (
        <p className='text-sm text-text-faint'>
          아직 실사용자(CrUX) 데이터가 없습니다. 트래픽이 쌓이면 표시됩니다.
        </p>
      )}
    </section>
  );
}
