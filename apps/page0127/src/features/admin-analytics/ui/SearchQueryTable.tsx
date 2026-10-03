import { formatMetric } from '../lib/ga4Reports';

import type { SearchQueryRow } from '../api/getSearchQueries';

type SearchQueryTableProps = { rows: SearchQueryRow[] };

export const SearchQueryTable = ({ rows }: SearchQueryTableProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='mb-2 text-sm font-medium'>검색어 (클릭 순)</div>
    {rows.length === 0 ? (
      <p className='text-xs text-text-subtle'>
        데이터 없음 — 검색 노출이 적거나, 데이터가 2~3일 늦게 들어옵니다.
      </p>
    ) : (
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-line text-left text-text-subtle'>
            <th className='py-1 font-normal'>검색어</th>
            <th className='py-1 text-right font-normal'>클릭</th>
            <th className='py-1 text-right font-normal'>노출</th>
            <th className='py-1 text-right font-normal'>클릭률</th>
            <th className='py-1 text-right font-normal'>평균 순위</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.query} className='border-b border-line last:border-0'>
              <td className='max-w-0 truncate py-1 pr-2' title={r.query}>
                {r.query}
              </td>
              <td className='py-1 text-right tabular-nums'>
                {formatMetric(r.clicks, 'int')}
              </td>
              <td className='py-1 text-right tabular-nums'>
                {formatMetric(r.impressions, 'int')}
              </td>
              <td className='py-1 text-right tabular-nums'>
                {formatMetric(r.ctr, 'percent')}
              </td>
              <td className='py-1 text-right tabular-nums'>
                {r.position.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
