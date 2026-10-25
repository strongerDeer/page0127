import { type Badge, BadgeMedal } from '@/features/badge';

import { Reveal } from './Reveal';
import { SafeCover } from './SafeCover';
import { SectionHead } from './SectionHead';

import type { ShelfBook } from '../model/coverRows';
import type { TopBook } from '../model/topBooks';

type HighlightsProps = { books: ShelfBook[]; top: TopBook[] };

type CoverProps = {
  src: string | null;
  /** src 를 못 불러왔을 때 쓸 Storage 사본 */
  fallbackSrc?: string | null;
  className: string;
  /** CSS 폭이 128px 이하인 자리 — YES24 M 만 받는다 */
  small?: boolean;
};

/** 표지 한 장 — 없거나 못 불러오면 같은 크기의 빈 판형을 둔다(카드 구도가 무너지지 않게) */
const Cover = ({ src, fallbackSrc, className, small }: CoverProps) => {
  const blank = (
    <span className={`block aspect-[2/3] rounded-sm bg-line ${className}`} />
  );
  return src ? (
    <SafeCover
      src={src}
      fallbackSrc={fallbackSrc}
      small={small}
      alt=''
      width={120}
      height={180}
      fallback={blank}
      className={`aspect-[2/3] rounded-sm object-cover shadow-lg ${className}`}
    />
  ) : (
    blank
  );
};

type CardProps = {
  lead: string;
  rest: string;
  blue?: boolean;
  /** 한 줄을 다 쓰는 카드 — 세로를 줄인다 */
  wide?: boolean;
  children: React.ReactNode;
};

/** 카드 하나에 메시지 하나 — 굵은 리드 문장으로 시작한다(애플 '핵심부터' 문법) */
const Card = ({ lead, rest, blue, wide, children }: CardProps) => (
  <article
    className={`flex h-full flex-col rounded-3xl p-7 md:p-8 ${
      wide ? 'min-h-[360px]' : 'min-h-[440px] md:min-h-[480px]'
    } ${blue ? 'stage-blue text-white' : 'bg-sunken'}`}
  >
    <p
      className={`text-balance text-lg font-medium ${blue ? 'text-white/80' : 'text-text-subtle'}`}
    >
      <b className={`font-bold ${blue ? 'text-white' : 'text-text-strong'}`}>
        {lead}
      </b>{' '}
      {rest}
    </p>
    <div className='mt-4 flex flex-1 items-center justify-center'>
      {children}
    </div>
  </article>
);

/** 피드 카드의 데모 활동 — 실제 사용자 이름·활동은 싣지 않는다 */
const FEED = [
  { who: '혜진', avatar: '혜', verb: '완독했어요', when: '방금' },
  { who: '준호', avatar: '준', verb: '읽기 시작했어요', when: '12분 전' },
  { who: '서연', avatar: '서', verb: '별점 ★5를 남겼어요', when: '1시간 전' },
] as const;

/** 배지 카드의 데모 — 받은 배지 넷과 아직 열리지 않은 히든 배지 하나 */
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

const WEEK = [0.3, 0.7, 0.2, 0.9, 0.45, 0.6, 0.15] as const;

export const Highlights = ({ books, top }: HighlightsProps) => {
  const covers = books.map((b) => b.coverImage).filter(Boolean);
  // 표지가 모자라도 카드마다 같은 표지가 반복되지 않게 순서를 돌려 쓴다
  const pick = (i: number) =>
    covers.length ? covers[i % covers.length] : null;

  return (
    // id: 홈 첫 화면의 "어떻게 쓰나요?"가 여기로 내려온다
    <section
      id='highlights'
      aria-labelledby='highlights-title'
      className='mx-auto max-w-6xl scroll-mt-20 px-4 py-24 md:py-32'
    >
      <SectionHead
        id='highlights-title'
        label='더 둘러보기'
        title={
          <>
            책장이 쌓이면
            <br />
            보이는 것들.
          </>
        }
      />
      <div className='mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
        {/* 넓은 카드 하나 + 여섯 장 — md(2열)·lg(3열) 어디서도 빈칸이 남지 않는다 */}
        <Reveal className='md:col-span-2 lg:col-span-3'>
          <Card
            wide
            lead='배지.'
            rest='책을 기록할수록 성장·분야·이야기·히든 배지 31종이 작은 전집처럼 모여요. 이미 기록한 책으로도 바로 받아요.'
          >
            <div className='flex w-full flex-col items-center'>
              <ul className='flex flex-wrap items-end justify-center gap-4 md:gap-6'>
                {BADGES.map((b) => (
                  <li key={b.id}>
                    <BadgeMedal badge={b} size={88} />
                  </li>
                ))}
              </ul>
              <p className='mt-6 rounded-full bg-card px-3.5 py-2 text-sm font-bold text-text-strong shadow-lg'>
                🎉 새 배지를 받았어요{' '}
                <span className='font-normal text-text-subtle'>
                  · 완독을 저장하면 바로 축하해 드려요
                </span>
              </p>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card
            blue
            lead='독서 케미.'
            rest='다른 사람의 책장과 나란히 놓고, 겹치는 책과 취향을 확인해요.'
          >
            <div className='text-center'>
              <p className='text-sm'>나 × 혜진</p>
              <p className='text-6xl font-bold'>78%</p>
              <div className='mt-5 flex justify-center gap-2'>
                {[0, 1, 2, 3].map((i) => (
                  <Cover key={i} src={pick(i + 3)} className='w-12' small />
                ))}
              </div>
              <p className='mt-3 text-xs text-white/75'>
                함께 읽은 책 4권 · 둘 다 &lsquo;관계&rsquo;를 좋아해요
              </p>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={1}>
          <Card
            lead='인생책.'
            rest='다시 꺼내 볼 한 권은 책등 대신 표지로 세워 둬요.'
          >
            <div className='relative h-56 w-64'>
              <Cover
                src={pick(7)}
                className='absolute left-0 top-4 w-28 -rotate-12'
              />
              <Cover
                src={pick(8)}
                className='absolute left-16 top-0 z-10 w-28'
              />
              <Cover
                src={pick(9)}
                className='absolute left-32 top-4 w-28 rotate-12'
              />
              <span className='absolute -bottom-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-3.5 py-2 text-sm font-bold text-primary shadow-lg'>
                ★ 인생책 3권
              </span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={2}>
          <Card
            lead='공개 서재.'
            rest='주소 하나로 내 책장을 보여 줘요. 링크로 공유하면 이렇게 보여요.'
          >
            <div className='w-full overflow-hidden rounded-2xl bg-card shadow-lg'>
              <div className='stage-blue flex h-36 items-end gap-1.5 px-4'>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Cover
                    key={i}
                    src={pick(i + 10)}
                    className='-mb-1.5 w-11'
                    small
                  />
                ))}
              </div>
              <div className='p-4'>
                <p className='text-base font-bold text-text-strong'>
                  혜진님의 서재
                </p>
                <p className='text-sm text-text-subtle'>
                  올해 23권 · 인생책 3권
                </p>
                <p className='text-xs font-bold text-primary'>
                  page0127.com/hyejin
                </p>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card lead='많이 읽힌 책.' rest='리더들이 가장 많이 완독한 책이에요.'>
            {top.length > 0 ? (
              <ol className='w-full space-y-3'>
                {top.map((b, i) => (
                  <li
                    key={b.isbn}
                    className='flex items-center gap-3.5 rounded-xl bg-card px-3.5 py-2.5'
                  >
                    <b className='w-4 text-lg text-primary'>{i + 1}</b>
                    <Cover
                      src={b.cover}
                      fallbackSrc={b.coverFallback}
                      className='w-10 shadow-none'
                      small
                    />
                    <span className='line-clamp-1 flex-1 text-sm font-bold text-text-strong'>
                      {b.title}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className='text-sm text-text-subtle'>집계 중이에요</p>
            )}
          </Card>
        </Reveal>

        <Reveal delay={1}>
          <Card
            lead='피드.'
            rest='팔로우한 리더가 책을 꽂으면 바로 알 수 있어요.'
          >
            <ul className='w-full space-y-2.5'>
              {FEED.map((f, i) => (
                <li
                  key={f.who}
                  className='flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 text-sm'
                >
                  <span className='grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground'>
                    {f.avatar}
                  </span>
                  <span className='flex-1'>
                    <b className='text-text-strong'>{f.who}</b>님이 {f.verb}
                    <span className='block text-xs text-text-subtle'>
                      {f.when}
                    </span>
                  </span>
                  <Cover src={pick(i + 15)} className='w-7 shadow-none' small />
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={2}>
          <Card
            lead='주간 회상.'
            rest='이번 주의 나를 한 장으로 돌아봐요. 앱으로 설치하면 알림으로 받아요.'
          >
            <div className='w-full rounded-2xl bg-card p-5 shadow-lg'>
              <p className='text-xs text-text-subtle'>이번 주</p>
              <p className='text-4xl font-bold text-text-strong'>
                2권{' '}
                <span className='text-base font-normal text-text-subtle'>
                  완독 · 312쪽
                </span>
              </p>
              <div
                aria-hidden='true'
                className='mt-3 flex h-16 items-end gap-1.5'
              >
                {WEEK.map((h, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${i % 2 ? 'bg-primary' : 'bg-accent'}`}
                    // 막대 높이는 연속값이라 클래스로 표현할 수 없다
                    style={{ height: `${h * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
};
