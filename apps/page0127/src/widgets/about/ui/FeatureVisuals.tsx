import { type Badge, BadgeMedal } from '@/features/badge';

import { SafeCover } from './SafeCover';

import type { ShelfBook } from '../model/coverRows';

/**
 * 홈 책 4~7장(공개 서재와 공유 · 독서 케미 · 배지 · 라운지)의 그림 — 쪽마다 하나씩 (시안 v9)
 *
 * 예전엔 "책장이 쌓이면 보이는 것들" 한 섹션에 카드 여섯 장을 몰아 넣어 화면 세 장 길이였다.
 * 책 홈은 한 쪽에 하나만 보여 주기로 해서(2026-11-17 HJ) 카드를 쪽 그림으로 나눴다.
 * 주간 회상·인생책 카드는 시안에 없어 뺐다.
 * 사람 이름·권수는 데모다 — 실제 사용자 기록은 싣지 않는다. 모두 장식이라 aria-hidden.
 */

type VisualProps = { books: ShelfBook[] };

type CoverProps = {
  src: string | null;
  className: string;
};

/** 표지 한 장 — 없거나 못 불러오면 같은 크기의 빈 판형을 둔다(그림 구도가 무너지지 않게) */
const Cover = ({ src, className }: CoverProps) => {
  const blank = (
    <span className={`block aspect-[2/3] rounded-sm bg-line ${className}`} />
  );
  return src ? (
    <SafeCover
      src={src}
      small
      alt=''
      width={80}
      height={120}
      fallback={blank}
      className={`aspect-[2/3] rounded-sm object-cover shadow-md ${className}`}
    />
  ) : (
    blank
  );
};

/** 표지가 모자라도 그림마다 같은 표지가 반복되지 않게 순서를 돌려 쓴다 */
const coverPicker = (books: ShelfBook[]) => {
  const covers = books.map((b) => b.coverImage).filter(Boolean);
  return (i: number) => (covers.length ? covers[i % covers.length] : null);
};

/** 4장 · 공개 서재와 공유 — 링크 미리보기 카드 + 스토리 이미지(9:16) */
export const ShareVisual = ({ books }: VisualProps) => {
  const pick = coverPicker(books);
  return (
    <div
      aria-hidden='true'
      className='flex w-full max-w-md items-stretch justify-center gap-4 md:gap-6'
    >
      <div className='flex w-full max-w-xs flex-col overflow-hidden rounded-2xl bg-card shadow-xl'>
        {/* 실제 공개 서재·링크 미리보기처럼 윗부분은 진한 파랑 */}
        <div className='stage-blue flex min-h-28 flex-1 items-end gap-1.5 px-4 md:min-h-32'>
          {[0, 1, 2, 3, 4].map((i) => (
            <Cover
              key={i}
              src={pick(i + 10)}
              className='-mb-1.5 w-10 md:w-11'
            />
          ))}
        </div>
        <div className='p-4'>
          <p className='text-base font-bold text-text-strong'>혜진님의 서재</p>
          <p className='text-sm text-text-subtle'>올해 23권 · 인생책 3권</p>
          <p className='text-xs font-bold text-primary'>page0127.com/hyejin</p>
        </div>
      </div>
      {/* 스토리 이미지 — 실제 공유 시트가 만드는 이미지(/{username}/story-image)의 구도를 줄여 그린다 */}
      <div className='hidden aspect-9/16 w-32 shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-xl sm:flex md:w-36'>
        <div className='stage-blue px-3 pt-5 pb-4 text-white'>
          <p className='text-[9px] font-bold'>hyejin</p>
          <p className='mt-2 inline-block rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-bold'>
            AI 독서 성향
          </p>
          <p className='mt-1 text-sm font-bold leading-tight'>
            이야기에
            <br />
            사는 사람
          </p>
          <p className='mt-1.5 text-[8px] text-white/80'>#소설 #에세이</p>
        </div>
        <div className='flex flex-1 flex-col items-center justify-center gap-1.5 px-2'>
          <div className='flex items-end gap-0.5'>
            {[0, 1, 2, 3].map((i) => (
              <Cover key={i} src={pick(i + 20)} className='w-6 shadow-none' />
            ))}
          </div>
          <p className='text-[9px] text-text-subtle'>올해 완독한 책</p>
          <p className='text-2xl font-bold leading-none text-text-strong'>
            23<span className='text-xs'>권</span>
          </p>
        </div>
      </div>
    </div>
  );
};

type MiniShelfProps = {
  who: string;
  covers: (string | null)[];
  /** 둘 다 읽은 책 자리 — 테두리로 동그라미 친다 */
  same: readonly number[];
};

const MiniShelf = ({ who, covers, same }: MiniShelfProps) => (
  <div className='flex flex-col items-center gap-2'>
    <div className='flex items-end gap-1 rounded-xl border-b-8 border-primary/20 bg-card px-2.5 pt-3 shadow-lg md:gap-1.5 md:px-3'>
      {covers.map((src, i) => (
        <span
          key={i}
          className={`-mb-1 rounded-sm ${same.includes(i) ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
        >
          <Cover src={src} className='w-9 md:w-12' />
        </span>
      ))}
    </div>
    <p className='text-sm font-bold text-text-strong'>{who}</p>
  </div>
);

/** 5장 · 독서 케미 — 두 책장을 나란히, 겹친 책에 동그라미 */
export const ChemVisual = ({ books }: VisualProps) => {
  const pick = coverPicker(books);
  const both = [pick(3), pick(4)];
  return (
    <div aria-hidden='true' className='flex flex-col items-center gap-5'>
      <div className='flex items-center gap-3 md:gap-6'>
        <MiniShelf
          who='나'
          covers={[pick(0), both[0], pick(1), both[1]]}
          same={[1, 3]}
        />
        <div className='text-center'>
          <p className='text-4xl font-bold text-primary md:text-6xl'>78%</p>
          <p className='mt-1 text-xs text-text-subtle md:text-sm'>
            함께 읽은 책 2권
          </p>
        </div>
        <MiniShelf
          who='혜진'
          covers={[both[0], pick(6), both[1], pick(7)]}
          same={[0, 2]}
        />
      </div>
      <p className='rounded-full bg-card px-4 py-2 text-sm font-bold text-text-strong shadow-md'>
        둘 다 &lsquo;관계&rsquo;를 좋아해요
      </p>
    </div>
  );
};

/** 배지 데모 — 받은 배지 넷과 아직 열리지 않은 히든 배지 하나 */
const demoBadge = (
  id: Badge['id'],
  kind: Badge['kind'],
  name: string,
  earned = true,
  level = 0
): Badge => ({
  id,
  kind,
  name,
  description: '',
  earned,
  earnedAt: null,
  book: null,
  level,
  progress: null,
});

const BADGES = [
  demoBadge('shelf', 'growth', '책장', true, 2),
  demoBadge('one-sitting', 'story', '단숨에'),
  demoBadge('brick', 'story', '벽돌책 완독'),
  demoBadge('life-book', 'story', '인생책 발견'),
  demoBadge('day-0127', 'hidden', '0127의 날', false),
] as const;

/** 6장 · 배지 — 작은 전집처럼 모인 배지 + 받았을 때의 알림 */
export const BadgeVisual = () => (
  <div aria-hidden='true' className='flex w-full flex-col items-center'>
    <ul className='flex flex-wrap items-end justify-center gap-3 md:gap-5'>
      {BADGES.map((b) => (
        <li key={b.id}>
          <BadgeMedal badge={b} size={72} />
        </li>
      ))}
    </ul>
    <p className='mt-6 rounded-2xl bg-card px-4 py-2.5 text-center text-sm font-bold text-text-strong shadow-lg sm:rounded-full sm:px-3.5 sm:py-2'>
      🎉 새 배지를 받았어요
      <span className='block font-normal text-text-subtle sm:inline'>
        <span className='hidden sm:inline'> · </span>
        완독을 저장하면 바로 축하해 드려요
      </span>
    </p>
  </div>
);

/** 라운지 데모 리그 — 시상대 순서(2·1·3위)로 둔다 */
const LEAGUE = [
  { who: '준호', avatar: '준', books: 18, rank: 2, height: 'h-16' },
  { who: '나', avatar: '나', books: 23, rank: 1, height: 'h-24' },
  { who: '서연', avatar: '서', books: 12, rank: 3, height: 'h-10' },
] as const;

// 색은 실제 라운지 시상대를 따른다 — 1등 파랑, 2등 민트, 3등 연한 파랑(2026-10-25 HJ)
const STEP_COLOR = {
  1: 'stage-blue text-white',
  2: 'stage-mint text-on-mint',
  3: 'bg-primary/15 text-primary',
} as const;

/** 7장 · 라운지 — 올해의 리더보드 시상대 + 방금 완독 소식 */
export const LoungeVisual = ({ books }: VisualProps) => {
  const pick = coverPicker(books);
  return (
    <div
      aria-hidden='true'
      className='w-full max-w-sm rounded-3xl bg-card p-5 shadow-xl md:p-6'
    >
      <p className='text-center text-xs font-bold tracking-wide text-text-subtle'>
        올해의 리더보드
      </p>
      <ol className='mt-4 flex items-end justify-center gap-3'>
        {LEAGUE.map((r) => (
          <li key={r.who} className='flex w-20 flex-col items-center'>
            <span
              className={`grid size-10 place-items-center rounded-full text-sm font-bold ${
                r.rank === 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sunken text-text-strong'
              }`}
            >
              {r.avatar}
            </span>
            <span className='mt-1.5 text-sm font-bold text-text-strong'>
              {r.books}권
            </span>
            <span
              className={`mt-1.5 grid w-full place-items-center rounded-t-lg text-sm font-bold ${r.height} ${STEP_COLOR[r.rank]}`}
            >
              {r.rank}
            </span>
          </li>
        ))}
      </ol>
      <p className='mt-4 flex items-center gap-2 rounded-xl bg-sunken px-3.5 py-3 text-sm'>
        <Cover src={pick(15)} className='w-6 shadow-none' />
        <span>
          <b className='text-text-strong'>준호</b>님이 방금 완독했어요
        </span>
      </p>
    </div>
  );
};
