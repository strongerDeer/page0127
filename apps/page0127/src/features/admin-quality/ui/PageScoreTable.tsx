import type { QualityRecord } from '@repo/quality/types';

export const PageScoreTable = ({ record }: { record: QualityRecord }) => {
  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>페이지별 점수 (모바일)</h2>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead className='text-text-faint'>
            <tr className='border-b border-line text-left'>
              <th className='py-2 pr-4 font-medium'>페이지</th>
              <th className='py-2 pr-4 font-medium'>성능</th>
              <th className='py-2 pr-4 font-medium'>접근성</th>
              <th className='py-2 pr-4 font-medium'>SEO</th>
              <th className='py-2 pr-4 font-medium'>모범사례</th>
              <th className='py-2 pr-4 font-medium'>LCP(랩)</th>
            </tr>
          </thead>
          <tbody>
            {record.pages.map((p) => (
              <tr key={p.name} className='border-b border-line/60'>
                <td className='py-2 pr-4'>{p.name}</td>
                <td className='py-2 pr-4'>{p.lighthouse.performance}</td>
                <td className='py-2 pr-4'>{p.lighthouse.accessibility}</td>
                <td className='py-2 pr-4'>{p.lighthouse.seo}</td>
                <td className='py-2 pr-4'>{p.lighthouse.bestPractices}</td>
                {/* 랩 LCP는 판정 제외 → 회색 */}
                <td className='py-2 pr-4 text-text-faint'>
                  {Math.round(p.cwv.lcp)}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
