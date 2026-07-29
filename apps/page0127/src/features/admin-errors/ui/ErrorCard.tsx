import type { Grade, TriagedIssue } from '../lib/triage';

const TONE: Record<Grade, string> = {
  urgent: 'border-red-300 bg-red-50',
  watch: 'border-amber-300 bg-amber-50',
  quiet: 'border-line',
  log: 'border-line',
  noise: 'border-line',
};

// 마지막 발생을 "2일 전"처럼 읽기 쉽게 바꾼다.
const sinceLabel = (lastSeen: string, now: Date) => {
  const diff = now.getTime() - new Date(lastSeen).getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

export const ErrorCard = ({ issue, now }: { issue: TriagedIssue; now: Date }) => (
  <li className={`rounded-lg border p-4 ${TONE[issue.grade]}`}>
    <div className='text-sm font-medium'>{issue.metadata?.type ?? '오류'}</div>
    <p className='mt-1 line-clamp-2 text-sm text-text-subtle'>
      {issue.metadata?.value ?? issue.title}
    </p>
    <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle'>
      <span>{issue.culprit ?? '위치 불명'}</span>
      <span>{issue.count}회</span>
      <span>{sinceLabel(issue.lastSeen, now)}</span>
      <span>{issue.shortId}</span>
      <a href={issue.permalink} target='_blank' rel='noreferrer' className='underline'>
        Sentry에서 보기
      </a>
    </div>
  </li>
);
