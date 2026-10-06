import { CountUp } from './CountUp';

import type { AboutStats } from '../model/aboutStats';

type StatsRowProps = { stats: AboutStats };

/** 숫자 + 단위 / 무엇 — '오간 번의' 같은 꾸밈말 없이 숫자가 먼저 읽히게 */
export const StatsRow = ({ stats }: StatsRowProps) => (
  <dl className='mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-32 text-center md:grid-cols-3'>
    {[
      { value: stats.books, unit: '권', label: '지금까지 기록된 책' },
      { value: stats.readers, unit: '명', label: '함께 읽는 리더' },
      { value: stats.matches, unit: '번', label: '맞춰 본 독서 궁합' },
    ].map((s) => (
      // 화면에는 숫자를 위에 두되, 읽는 순서(dt → dd)는 지킨다
      <div key={s.label} className='flex flex-col-reverse'>
        <dt className='mt-1 text-base text-text-body'>{s.label}</dt>
        <dd className='text-5xl font-bold text-primary md:text-6xl'>
          <CountUp to={s.value} unit={s.unit} />
        </dd>
      </div>
    ))}
  </dl>
);
