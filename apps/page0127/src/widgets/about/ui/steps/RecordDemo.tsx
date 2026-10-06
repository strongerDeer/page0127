import { SafeCover } from '../SafeCover';

type RecordDemoProps = {
  stars: number;
  memoRatio: number;
  cover: string | null;
  title: string;
};

const MEMO = '흔들릴 때마다 한 장씩 펼쳐 보게 되는 책.';

/** ① 기록 — 별점이 차고 메모가 써진다 (앱의 기록 카드를 같은 토큰으로 줄인 데모) */
export const RecordDemo = ({
  stars,
  memoRatio,
  cover,
  title,
}: RecordDemoProps) => (
  <div className='rounded-2xl bg-sunken p-5'>
    <div className='flex gap-4'>
      {cover && (
        <SafeCover
          src={cover}
          alt=''
          width={64}
          height={96}
          className='h-24 w-16 shrink-0 rounded-sm object-cover shadow'
        />
      )}
      <div>
        <span className='rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary'>
          완독
        </span>
        <p className='mt-2 text-base font-bold text-text-strong'>{title}</p>
        {/* 별 하나하나는 장식 — 점수는 role=img 의 이름으로 읽힌다.
            간격은 자간이 아니라 gap 으로 준다(07: 자간 조정 금지) */}
        <p
          role='img'
          aria-label={`별점 ${stars}점`}
          className='mt-1 flex gap-1 text-lg text-primary'
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} aria-hidden='true'>
              {i < stars ? '★' : '☆'}
            </span>
          ))}
        </p>
      </div>
    </div>
    <p className='mt-3 min-h-16 rounded-xl bg-card p-3 text-sm text-text-body'>
      {MEMO.slice(0, Math.round(MEMO.length * memoRatio))}
    </p>
  </div>
);
