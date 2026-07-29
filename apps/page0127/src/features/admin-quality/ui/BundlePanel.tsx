import type { QualityRecord } from '@repo/quality/types';

// 첫 로드 번들 — 공유 청크 + 라우트별 first-load KB. 라우트별 막대는 최대값 대비 상대 길이.
export const BundlePanel = ({ record }: { record: QualityRecord }) => {
  const { totalFirstLoadKb, routes } = record.bundle;
  // 'shared'(공유 청크)는 별도로 빼고, 나머지 라우트를 무거운 순으로.
  const perRoute = routes
    .filter((r) => r.route !== 'shared')
    .sort((a, b) => b.firstLoadKb - a.firstLoadKb);
  const max = perRoute.reduce((m, r) => Math.max(m, r.firstLoadKb), 1);

  return (
    <section className='rounded-lg border border-line p-4'>
      <div className='mb-3 flex items-baseline justify-between'>
        <h2 className='text-sm font-medium'>첫 로드 번들</h2>
        <span className='text-xs text-text-subtle'>
          공유 청크{' '}
          <span className='font-medium tabular-nums text-gray-900'>
            {totalFirstLoadKb}KB
          </span>
        </span>
      </div>

      {perRoute.length === 0 ? (
        <p className='text-sm text-text-subtle'>라우트별 번들 데이터가 없습니다.</p>
      ) : (
        <ul className='space-y-2'>
          {perRoute.map((r) => (
            <li key={r.route} className='flex items-center gap-3 text-sm'>
              <span className='w-40 flex-none truncate text-text-subtle' title={r.route}>
                {r.route}
              </span>
              <span className='h-2 flex-1 overflow-hidden rounded-full bg-gray-100'>
                <span
                  className='block h-full rounded-full bg-gray-400'
                  style={{ width: `${(r.firstLoadKb / max) * 100}%` }}
                />
              </span>
              <span className='w-16 flex-none text-right font-medium tabular-nums'>
                {r.firstLoadKb}KB
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
