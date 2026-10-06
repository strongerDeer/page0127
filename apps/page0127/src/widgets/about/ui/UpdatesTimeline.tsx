import { CHANGELOG } from '@/widgets/landing/model/siteInfo';

import { Reveal } from './Reveal';
import { SectionHead } from './SectionHead';

type UpdatesTimelineProps = { limit?: number };

/**
 * 업데이트 — 날짜를 지어내지 않는다. CHANGELOG(실제 배포만 기록, 최신순)를
 * 순서 그대로 앞에서 자른다. 가장 최근 항목만 파란 점으로 강조한다.
 */
export const UpdatesTimeline = ({ limit = 5 }: UpdatesTimelineProps) => (
  <section aria-labelledby='updates-title' className='bg-sunken px-4 py-32'>
    <SectionHead id='updates-title' label='업데이트' title='계속 자라는 중.' />
    <ol className='relative mx-auto mt-14 max-w-3xl before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-line'>
      {CHANGELOG.slice(0, limit).map((entry, i) => (
        <li key={entry.date} className='relative pb-9 pl-12'>
          <span
            aria-hidden='true'
            className={`absolute left-1 top-1.5 size-4 rounded-full border-[3px] ${
              i === 0
                ? 'border-primary bg-primary ring-4 ring-accent'
                : 'border-line bg-card'
            }`}
          />
          <Reveal>
            <time className='text-sm font-bold text-primary'>{entry.date}</time>
            {/* text-xl(20px) 은 07 스케일의 heading 단계. 목록 항목이라 h3 로 올리지 않는다 */}
            <p className='mt-1 text-xl font-bold text-text-strong'>
              {entry.title}
            </p>
            {entry.description && (
              <p className='mt-1.5 text-balance text-base text-text-subtle'>
                {entry.description}
              </p>
            )}
          </Reveal>
        </li>
      ))}
    </ol>
  </section>
);
