import { shortDate } from '@/shared/lib/admin/dateRange';

import { createAdminEvent, deleteAdminEvent } from '../api/eventActions';

import type { AdminEvent } from '../api/getAdminEvents';

type AdminEventsPanelProps = {
  /** null = 조회 실패 */
  events: AdminEvent[] | null;
  /** 새 기록 날짜 기본값 (KST 오늘) */
  today: string;
};

/**
 * 운영 기록 — "이날 인스타 스토리에 올렸다" 같은 일을 날짜와 함께 남긴다.
 * 숫자가 튄 날 이유를 나중에 기억에 기대지 않고 바로 보려고. 유입분석 일별 차트에는 세로선으로도 찍힌다.
 *
 * 서버 컴포넌트 + server action 폼이라 JS 없이도 추가·삭제가 된다.
 */
export const AdminEventsPanel = ({ events, today }: AdminEventsPanelProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='text-sm font-medium'>이 기간 운영 기록</div>
    <p className='mt-0.5 text-xs text-text-subtle'>
      공유·모집 글·기능 출시처럼 숫자에 영향을 줄 만한 일을 남겨 두세요.
    </p>

    {events === null ? (
      <p className='mt-3 text-xs text-text-subtle'>
        기록을 불러오지 못했습니다.
      </p>
    ) : events.length === 0 ? (
      <p className='mt-3 text-xs text-text-subtle'>이 기간 기록이 없어요.</p>
    ) : (
      <ul className='mt-3 flex flex-col gap-1.5 text-sm'>
        {events.map((e) => (
          <li key={e.id} className='flex items-baseline gap-2'>
            <span className='shrink-0 tabular-nums text-text-subtle'>
              {shortDate(e.date)}
            </span>
            <span className='min-w-0 flex-1'>
              {e.title}
              {e.note && (
                <span className='ml-1.5 text-xs text-text-subtle'>
                  {e.note}
                </span>
              )}
            </span>
            <form action={deleteAdminEvent}>
              <input type='hidden' name='id' value={e.id} />
              <button
                type='submit'
                className='text-xs text-text-subtle hover:underline'
                aria-label={`${shortDate(e.date)} ${e.title} 기록 지우기`}
              >
                지우기
              </button>
            </form>
          </li>
        ))}
      </ul>
    )}

    <form
      action={createAdminEvent}
      className='mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3'
    >
      <label className='sr-only' htmlFor='admin-event-date'>
        날짜
      </label>
      <input
        id='admin-event-date'
        type='date'
        name='date'
        required
        max={today}
        defaultValue={today}
        className='rounded border border-line bg-transparent px-2 py-1 text-sm tabular-nums'
      />
      <label className='sr-only' htmlFor='admin-event-title'>
        무슨 일
      </label>
      <input
        id='admin-event-title'
        name='title'
        required
        maxLength={100}
        placeholder='예: 인스타 개인 스토리에 공유'
        className='min-w-0 flex-1 rounded border border-line bg-transparent px-2 py-1 text-sm'
      />
      <button
        type='submit'
        className='rounded border border-line px-3 py-1 text-sm font-medium hover:bg-accent'
      >
        기록
      </button>
    </form>
  </div>
);
