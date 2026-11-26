import type { GaRealtimeResult } from '../api/getGaRealtime';

/**
 * 지금 접속 중(지난 30분). 페이지를 새로 열 때마다 다시 읽는다 — 자동 새로고침은 하지 않는다
 * (켜 두면 GA 실시간 쿼터를 계속 쓴다).
 */
export const RealtimePanel = ({ result }: { result: GaRealtimeResult }) => {
  if (result.status !== 'ok') {
    return (
      <p className='rounded-lg border border-line p-3 text-sm text-text-subtle'>
        실시간 접속을 불러오지 못했습니다.
      </p>
    );
  }
  return (
    <div className='space-y-2 rounded-lg border border-line p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6'>
        <div className='shrink-0'>
          <p className='text-xs text-text-subtle'>지금 접속 중 · 지난 30분</p>
          <p className='text-2xl font-medium tabular-nums'>
            {result.activeUsers}
            <span className='ml-0.5 text-sm font-normal text-text-subtle'>
              명
            </span>
          </p>
        </div>
        {result.pages.length > 0 ? (
          <ul className='min-w-0 flex-1 space-y-1 text-sm'>
            {result.pages.map((p) => (
              <li key={p.title} className='flex items-baseline gap-2'>
                <span className='min-w-0 flex-1 truncate' title={p.title}>
                  {p.title}
                </span>
                <span className='shrink-0 tabular-nums text-text-subtle'>
                  {p.users}명
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-text-subtle'>
            지금 보고 있는 사람이 없어요.
          </p>
        )}
      </div>
      {/* 사람이 적어 대부분 비어 있다 — 큰 칸 대신 한 줄(HJ 2026-11-26) */}
      <p className='border-t border-line/60 pt-2 text-xs text-text-subtle'>
        지난 30분 이벤트:{' '}
        {result.events.length > 0
          ? result.events.map((e, i) => (
              <span key={e.name}>
                {i > 0 && ' · '}
                <span className='text-text-body'>{e.label}</span>{' '}
                <span className='tabular-nums'>{e.count}</span>
              </span>
            ))
          : '아직 없어요'}
      </p>
    </div>
  );
};
