import type { QualityRecord } from '@repo/quality/types';

export const RegressionBanner = ({ record }: { record: QualityRecord }) => {
  const regressions = record.regressions ?? [];
  if (regressions.length === 0) return null;
  return (
    <section className='rounded-lg border border-red-300 bg-red-50 p-4'>
      <h2 className='mb-2 text-sm font-semibold text-red-700'>
        회귀 {regressions.length}건 감지
      </h2>
      <ul className='list-disc space-y-1 pl-5 text-sm text-red-700'>
        {regressions.map((r, i) => (
          <li key={i}>{r.detail}</li>
        ))}
      </ul>
    </section>
  );
}
