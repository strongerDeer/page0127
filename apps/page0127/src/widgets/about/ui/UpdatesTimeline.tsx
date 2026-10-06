import {
  CHANGELOG,
  type ChangelogEntry,
} from '@/widgets/landing/model/siteInfo';

import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';

type UpdatesTimelineProps = { limit?: number };

/** 세로 선 — 두 목록(처음 보이는 것·접힌 것)이 같은 선 위에 이어져 보이게 */
const LINE =
  'relative mx-auto max-w-3xl before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-line';

type EntryProps = { entry: ChangelogEntry; latest?: boolean };

const Entry = ({ entry, latest }: EntryProps) => (
  <li className='relative pb-9 pl-12'>
    <span
      aria-hidden='true'
      className={`absolute left-1 top-1.5 size-4 rounded-full border-[3px] ${
        latest
          ? 'border-primary bg-primary ring-4 ring-accent'
          : 'border-line bg-card'
      }`}
    />
    <Reveal>
      <time className='text-sm font-bold text-primary'>{entry.date}</time>
      {/* text-xl(20px) 은 07 스케일의 heading 단계. 목록 항목이라 h3 로 올리지 않는다 */}
      <p className='mt-1 text-xl font-bold text-text-strong'>{entry.title}</p>
      {entry.description && (
        <p className='mt-1.5 text-balance text-base text-text-subtle'>
          {entry.description}
        </p>
      )}
    </Reveal>
  </li>
);

/**
 * 업데이트 — 날짜를 지어내지 않는다. CHANGELOG(실제 배포만 기록, 최신순)를 그대로 쓴다.
 * 처음엔 최근 limit 개만 보이고, 나머지는 '전체 이력 보기'로 접어 둔다 —
 * 설득 페이지의 흐름은 짧게, 이력은 사이트 어딘가에 남겨 둔다(여기가 유일한 자리다).
 */
export const UpdatesTimeline = ({ limit = 5 }: UpdatesTimelineProps) => {
  const recent = CHANGELOG.slice(0, limit);
  const older = CHANGELOG.slice(limit);

  return (
    <section aria-labelledby='updates-title' className='bg-sunken px-4 py-32'>
      <SectionHead
        id='updates-title'
        label='업데이트'
        title='계속 자라는 중.'
      />
      <ol className={`${LINE} mt-14`}>
        {recent.map((entry, i) => (
          <Entry key={entry.date} entry={entry} latest={i === 0} />
        ))}
      </ol>
      {older.length > 0 && (
        <details className='group mx-auto max-w-3xl'>
          <summary className='cursor-pointer list-none rounded-xl py-2 pl-12 text-sm font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'>
            <span className='group-open:hidden'>
              전체 이력 보기 ({older.length}개 더)
            </span>
            <span className='hidden group-open:inline'>이력 접기</span>
          </summary>
          <ol className={`${LINE} mt-6`}>
            {older.map((entry) => (
              <Entry key={entry.date} entry={entry} />
            ))}
          </ol>
        </details>
      )}
    </section>
  );
};
