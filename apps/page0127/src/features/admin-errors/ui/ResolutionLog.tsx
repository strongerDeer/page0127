import { CircleCheck } from 'lucide-react';

import { RESOLUTIONS } from '../lib/resolutions';

const REPO_PULL = 'https://github.com/strongerDeer/page0127/pull/';

// 해결한 오류는 평소 시야를 가리지 않도록 접어둔다(로그성·노이즈와 같은 규칙).
export const ResolutionLog = () => {
  if (RESOLUTIONS.length === 0) return null;

  return (
    <details>
      {/* summary 자체에 flex를 주면 펼침 삼각형 마커가 사라진다. 안쪽 span으로 정렬한다 */}
      <summary className='cursor-pointer text-sm font-medium'>
        <span className='inline-flex items-center gap-2 align-middle'>
          <CircleCheck className='h-4 w-4 text-emerald-600' aria-hidden />
          해결 기록 ({RESOLUTIONS.length})
        </span>
      </summary>
      <p className='mt-1 text-xs text-text-subtle'>
        Resolve 한 오류의 원인과 해결.
        src/features/admin-errors/lib/resolutions.ts 에서 관리합니다
      </p>
      <ul className='mt-2 space-y-2'>
        {RESOLUTIONS.map((r) => (
          <li key={r.shortId} className='rounded-lg border border-line p-4'>
            <div className='flex flex-wrap items-baseline gap-x-3 text-sm'>
              <span className='font-medium'>{r.title}</span>
              <span className='text-xs text-text-subtle'>
                {r.shortId} · {r.resolvedAt} 해결
              </span>
            </div>
            <p className='mt-1 text-xs text-text-subtle'>{r.culprit}</p>
            <dl className='mt-2 space-y-1 text-sm'>
              <div>
                <dt className='inline font-medium'>원인 </dt>
                <dd className='inline text-text-subtle'>{r.cause}</dd>
              </div>
              <div>
                <dt className='inline font-medium'>해결 </dt>
                <dd className='inline text-text-subtle'>{r.fix}</dd>
              </div>
            </dl>
            {r.prs.length > 0 && (
              <div className='mt-2 flex gap-2 text-xs'>
                {r.prs.map((n) => (
                  <a
                    key={n}
                    href={`${REPO_PULL}${n}`}
                    target='_blank'
                    rel='noreferrer'
                    className='underline'
                  >
                    PR #{n}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
};
