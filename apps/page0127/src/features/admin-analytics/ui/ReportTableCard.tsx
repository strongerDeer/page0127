import {
  formatMetric,
  type ReportDef,
  type ReportTable,
} from '../lib/ga4Reports';

type ReportTableCardProps = {
  def: ReportDef;
  table: ReportTable;
};

/** GA 보고서 하나 = 카드 하나. 차원 열 + 측정항목 열 */
export const ReportTableCard = ({ def, table }: ReportTableCardProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='mb-2 text-sm font-medium'>{def.title}</div>
    {table.rows.length === 0 ? (
      <p className='text-xs text-text-subtle'>
        데이터 없음{def.emptyHint ? ` — ${def.emptyHint}` : ''}
      </p>
    ) : (
      <table className='w-full text-xs'>
        <thead>
          <tr className='border-b border-line text-left text-text-subtle'>
            <th className='py-1 font-normal'>
              {def.dimensions.length > 1 ? '소스 / 매체 / 캠페인' : '항목'}
            </th>
            {def.metrics.map((m) => (
              <th key={m.name} className='py-1 text-right font-normal'>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            // 차원 값 조합은 보고서 안에서 유일하다 — index 대신 키로 쓴다
            <tr
              key={r.labels.join('|')}
              className='border-b border-line last:border-0'
            >
              <td
                className='max-w-0 truncate py-1 pr-2'
                title={r.labels.join(' / ')}
              >
                {r.labels.join(' / ')}
              </td>
              {r.values.map((v, i) => (
                <td
                  key={def.metrics[i].name}
                  className='py-1 text-right tabular-nums'
                >
                  {formatMetric(v, def.metrics[i].format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);
