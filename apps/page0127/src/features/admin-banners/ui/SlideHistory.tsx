import {
  ACTION_LABEL,
  describeChanges,
  eventTime,
  type SlideEvent,
} from '@/features/admin-banners/lib/slideEvents';

type SlideHistoryProps = {
  events: SlideEvent[];
  /** 전체 기록에선 어느 배너인지 이름을 함께 보인다 */
  showTitle?: boolean;
  empty?: string;
};

/**
 * 배너 수정 기록 목록 — "11.27 17:55 · 저장 · 큰 문장 첫 줄: A → B".
 * 서버 컴포넌트·클라이언트 어디서나 쓰도록 상태 없이 그린다.
 */
export const SlideHistory = ({
  events,
  showTitle = false,
  empty = '아직 기록이 없어요.',
}: SlideHistoryProps) => {
  if (events.length === 0)
    return <p className='text-xs text-text-subtle'>{empty}</p>;

  return (
    <ol className='flex flex-col gap-1.5 text-xs'>
      {events.map((e) => {
        const lines = describeChanges(e.changes);
        return (
          <li
            key={e.id}
            className='grid grid-cols-[5.5rem_1fr] gap-2 border-b border-line/60 pb-1.5 last:border-0'
          >
            <span className='tabular-nums text-text-subtle'>
              {eventTime(e.created_at)}
            </span>
            <span className='flex flex-col gap-0.5'>
              <span>
                <b className='font-semibold'>{ACTION_LABEL[e.action]}</b>
                {showTitle && e.slide_title && (
                  <span className='text-text-subtle'> · {e.slide_title}</span>
                )}
              </span>
              {lines.map((line) => (
                <span key={line} className='text-text-subtle'>
                  {line}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
