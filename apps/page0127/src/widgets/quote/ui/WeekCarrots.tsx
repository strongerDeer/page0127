import { WEEKDAYS, weekOf } from '@/entities/daily-sentence';

import { CarrotSvg } from '@/features/daily-sentence';

import styles from './SentencePage.module.css';

type WeekCarrotsProps = {
  /** 오늘(KST 'YYYY-MM-DD') — 서버가 정해 넘긴다(자정 근처 서버·브라우저 날짜 어긋남 방지) */
  todayKey: string;
  /** 문장을 뽑은 날짜들(KST 'YYYY-MM-DD') */
  drawnDates: ReadonlySet<string>;
};

/**
 * 이번 주 7칸 — 뽑은 날엔 당근이 꽂히고, 안 뽑은 날은 점선 동그라미(HJ A안, 2026-11-26).
 * 인스타 캐러셀 5번 카드와 같은 모양. 장식이 아니라 기록이라 목록(ol)으로 읽힌다.
 */
export const WeekCarrots = ({ todayKey, drawnDates }: WeekCarrotsProps) => {
  const days = weekOf(todayKey);
  const count = days.filter((date) => drawnDates.has(date)).length;

  return (
    <section
      aria-labelledby='week-carrots'
      className='flex max-w-xl flex-col gap-3'
    >
      <div className='flex items-baseline justify-between'>
        <h3 id='week-carrots' className='text-sm font-bold text-text-strong'>
          이번 주
        </h3>
        <span className='text-xs text-text-subtle'>{count}번 뽑았어요</span>
      </div>
      <ol className='grid grid-cols-7 gap-1.5 sm:gap-2.5'>
        {days.map((date, i) => {
          const drawn = drawnDates.has(date);
          const day = Number(date.slice(8, 10));
          return (
            <li
              key={date}
              className={styles.weekDay}
              data-today={date === todayKey ? '' : undefined}
              data-future={date > todayKey ? '' : undefined}
              aria-label={`${WEEKDAYS[i]}요일 ${day}일${drawn ? ' 뽑음' : ''}`}
            >
              <span aria-hidden>{WEEKDAYS[i]}</span>
              {drawn ? (
                <CarrotSvg className={styles.carrot} />
              ) : (
                <i aria-hidden className={styles.emptyMark} />
              )}
              <b aria-hidden>{day}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
