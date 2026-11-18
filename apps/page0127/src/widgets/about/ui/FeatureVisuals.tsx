import { PenNote } from '@/shared/ui/PenNote';

import { SPINE_TONE_COLORS, spineTone } from '@/entities/book/model/spineTone';

import { type Badge, BadgeMedal } from '@/features/badge';

import { SafeCover } from './SafeCover';

import type { ShelfBook } from '../model/coverRows';

/**
 * 홈 책 뒤쪽 장(공개 서재와 공유 · 문장 · 독서 케미 · 배지 · 라운지)의 그림 — 쪽마다 하나씩 (시안 v9)
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

/**
 * 데모 문장 — 실제 책의 문장을 옮기면 저작권·출처 표시가 따라온다.
 * 그래서 page0127. 이 직접 쓴 문장만 쓰고 책 표지·제목은 붙이지 않는다.
 */
const DEMO_QUOTE = '어떤 문장은 읽은 날보다 오래 남는다.';
const DEMO_SAVED = [
  { text: '밑줄은 그 날의 나를 기억하는 방법.', page: 'p.48' },
  { text: '천천히 읽어도 끝은 온다.', page: 'p.213' },
] as const;

/** 문장 장 · 오늘의 문장(펼친 책) + 간직한 문장 + 스토리 카드 */
export const SentenceVisual = () => (
  <div
    aria-hidden='true'
    className='flex w-full max-w-md items-stretch justify-center gap-4 md:gap-6'
  >
    <div className='flex w-full max-w-xs flex-col gap-3'>
      <div className='rounded-2xl bg-card p-4 shadow-xl'>
        <p className='flex items-baseline justify-between text-xs'>
          <b className='text-text-strong'>오늘의 문장</b>
          <span className='text-text-subtle'>하루 한 번 펼쳐요</span>
        </p>
        {/* 펼친 책 — 가운데 접힌 선 하나로 두 쪽을 나눈다 */}
        <div className='relative mt-3 grid grid-cols-2 overflow-hidden rounded-md bg-sunken shadow-inner'>
          <span className='absolute inset-y-0 left-1/2 w-px bg-text-strong/10' />
          <span className='absolute -top-1 right-6 h-8 w-2.5 rounded-b-sm bg-primary' />
          <p className='col-span-2 px-5 py-6 text-center text-[15px] leading-relaxed font-bold text-text-strong'>
            {DEMO_QUOTE}
          </p>
        </div>
        <p className='mt-2 text-[11px] text-text-subtle'>
          펼친 날은 캘린더에 책갈피로 남아요
        </p>
      </div>
      <ul className='space-y-2'>
        {DEMO_SAVED.map((q) => (
          <li
            key={q.page}
            className='flex items-center gap-2.5 rounded-xl bg-card px-3.5 py-2.5 text-sm shadow-md'
          >
            <span className='h-6 w-1 shrink-0 rounded-full bg-primary/40' />
            <span className='min-w-0 flex-1 truncate text-text-strong'>
              {q.text}
            </span>
            <span className='shrink-0 text-xs text-text-subtle'>{q.page}</span>
          </li>
        ))}
      </ul>
    </div>
    {/* 문장 카드 스토리 이미지 — 실제 공유 이미지처럼 위는 파랑, 문장이 주인공 */}
    <div className='hidden aspect-9/16 w-32 shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-xl sm:flex md:w-36'>
      <div className='stage-blue flex flex-1 flex-col justify-center px-3.5 text-white'>
        <span className='text-2xl leading-none font-bold text-white/50'>“</span>
        <p className='mt-1 text-[13px] leading-snug font-bold'>{DEMO_QUOTE}</p>
      </div>
      <p className='py-2 text-center text-[9px] font-bold text-primary'>
        page0127.com
      </p>
    </div>
  </div>
);

// 책장에 꽂힌 높이 — 책마다 조금씩 달라야 진짜 책장처럼 보인다
const SPINE_HEIGHTS = ['h-[88%]', 'h-full', 'h-[80%]', 'h-[94%]', 'h-[84%]'];

/** 책등 한 권 — 책등 사진이 있으면 그것, 없으면 서재와 같은 색 + 세로 제목 책등 */
const Spine = ({ book, i }: { book: ShelfBook | null; i: number }) => {
  const title = book?.title ?? '';
  const text = (
    <span
      className='flex h-full w-5 items-center justify-center overflow-hidden rounded-[2px] px-0.5 py-1.5 md:w-6'
      style={{
        backgroundColor: SPINE_TONE_COLORS[spineTone(book?.id ?? String(i))],
      }}
    >
      <span className='h-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-medium leading-tight text-[#1f1d1a] [writing-mode:vertical-rl]'>
        {title}
      </span>
    </span>
  );
  return (
    <span
      className={`block shrink-0 ${SPINE_HEIGHTS[i % SPINE_HEIGHTS.length]}`}
    >
      {book?.spineImage ? (
        <SafeCover
          src={book.spineImage}
          small
          alt=''
          width={24}
          height={160}
          fallback={text}
          className='h-full w-auto rounded-[2px] object-contain'
        />
      ) : (
        text
      )}
    </span>
  );
};

type ChemShelfProps = {
  who: string;
  books: (ShelfBook | null)[];
  /** 둘 다 읽은 책을 뽑아 올린 자리 — 빈칸으로 남긴다 */
  pulled: readonly number[];
};

/** 한 사람의 서재 한 칸 — 책등으로 꽂힌 책들, 함께 읽은 책은 위로 뽑혀 빈자리만 남는다 */
const ChemShelf = ({ who, books, pulled }: ChemShelfProps) => (
  <div className='flex flex-col items-center gap-2'>
    <div className='flex h-28 items-end gap-[3px] rounded-t-md border-b-[10px] border-[#c9a77c] bg-card px-2.5 pt-2.5 shadow-[inset_0_8px_14px_-10px_rgb(20_41_78/0.35)] md:h-36 md:px-3'>
      {books.map((b, i) =>
        pulled.includes(i) ? (
          // 뽑혀 나간 자리 — 위의 표지와 같은 책
          <span
            key={i}
            className='block h-[86%] w-5 shrink-0 rounded-[2px] border-2 border-dashed border-primary/45 md:w-6'
          />
        ) : (
          <Spine key={i} book={b} i={i} />
        )
      )}
    </div>
    <p className='text-sm font-bold text-text-strong'>{who}의 서재</p>
  </div>
);

/**
 * 5장 · 독서 케미 — 두 사람의 서재(책등)를 나란히 놓고, 둘 다 읽은 책만 위로 뽑아 표지를 보여 준다
 * (2026-11-17 HJ "각자 책등으로 꽂힌 서재, 동일하게 읽은 책은 위로 해서 2권 정도 책표지")
 */
export const ChemVisual = ({ books }: VisualProps) => {
  // 표지를 세워 보여 주는 "둘 다 읽은 책"은 표지 있는 책으로 고른다 — 최근 책 순서 그대로 쓰면
  // 표지 없는 책이 걸려 회색 빈칸이 됐다(2026-11-18 점검). 나머지 책은 책등이라 표지가 없어도 된다
  const withCover = books.filter((b) => b.coverImage);
  const rest = books.filter((b) => !withCover.slice(0, 2).includes(b));
  const at = (i: number) => (rest.length ? rest[i % rest.length] : null);
  const both = [withCover[0] ?? at(3), withCover[1] ?? at(4)];
  const mine = [at(0), at(1), both[0], at(2), at(5), both[1], at(6)];
  const hers = [at(7), both[0], at(8), at(3), both[1], at(9), at(10)];

  return (
    <div aria-hidden='true' className='flex w-full flex-col items-center'>
      {/* 둘 다 읽은 책 — 서재에서 뽑아 표지가 보이게 세운다 */}
      {/* 메모는 좁은 화면에서 위 설명 글을 덮어 뺀다(2026-11-18 HJ) */}
      <div className='relative flex items-end gap-3'>
        <PenNote
          hideOnMobile
          className='absolute bottom-full left-full -ml-2 mb-1 text-[26px]'
        >
          겹친 책에 동그라미!
        </PenNote>
        {both.map((b, i) => (
          <Cover
            key={i}
            src={b?.coverImage ?? null}
            className={`w-16 shadow-xl md:w-20 ${i ? 'rotate-3' : '-rotate-3'}`}
          />
        ))}
      </div>
      <p className='mt-3 flex items-baseline gap-2'>
        <b className='text-3xl font-bold text-primary md:text-4xl'>78%</b>
        <span className='text-sm text-text-subtle'>둘 다 읽은 책 2권</span>
      </p>

      <div className='mt-4 flex items-start gap-4 md:gap-8'>
        <ChemShelf who='나' books={mine} pulled={[2, 5]} />
        <ChemShelf who='혜진' books={hers} pulled={[1, 4]} />
      </div>

      {/* 좁은 화면은 쪽이 넘쳐 뺀다 — 서재 두 칸과 78% 로 뜻이 충분히 전해진다(2026-11-18 HJ "컨텐츠 줄이기") */}
      <p className='mt-4 hidden rounded-full bg-card px-4 py-2 text-sm font-bold text-text-strong shadow-md md:block'>
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
