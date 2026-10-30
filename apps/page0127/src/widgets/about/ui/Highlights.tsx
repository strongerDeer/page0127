import { type Badge, BadgeMedal } from '@/features/badge';
import { InstallGuideLink } from '@/features/pwa-install';

import { Reveal } from './Reveal';
import { SafeCover } from './SafeCover';
import { SectionHead } from './SectionHead';

import type { ShelfBook } from '../model/coverRows';

type HighlightsProps = { books: ShelfBook[] };

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
  rest: React.ReactNode;
  /** 강조 카드의 면 — 없으면 중립 면(sunken). mint 는 쨍한 민트 무대(남색 글자) */
  tone?: 'blue' | 'mint';
  /** 한 줄을 다 쓰는 카드 — 세로를 줄인다 */
  wide?: boolean;
  children: React.ReactNode;
};

const TONE_BG = {
  blue: 'tint-blue',
  mint: 'stage-mint text-on-mint',
} as const;

/**
 * 카드 하나에 메시지 하나 — 굵은 리드 문장으로 시작한다(애플 '핵심부터' 문법).
 * 공유 카드는 옅은 파란 면 + 남색 글자(2026-10-25 색 정리 B안), 케미 카드는 쨍한 민트 무대 —
 * 옅은 민트 면은 탁해 보였다(HJ "배경이 쨍한 게 예뻤다").
 */
const Card = ({ lead, rest, tone, wide, children }: CardProps) => (
  <article
    className={`flex h-full flex-col rounded-3xl p-7 md:p-8 ${
      wide ? 'min-h-[360px]' : 'min-h-[440px] md:min-h-[480px]'
    } ${tone ? TONE_BG[tone] : 'bg-card'}`}
  >
    <p
      className={`text-balance text-lg font-medium ${tone === 'mint' ? 'text-on-mint/75' : 'text-text-subtle'}`}
    >
      <b
        className={`font-bold ${tone === 'mint' ? 'text-on-mint' : 'text-text-strong'}`}
      >
        {lead}
      </b>{' '}
      {rest}
    </p>
    <div className='mt-4 flex flex-1 items-center justify-center'>
      {children}
    </div>
  </article>
);

/** 라운지 카드의 데모 리그 — 실제 사용자 이름·기록은 싣지 않는다. 시상대 순서(2·1·3위)로 둔다 */
const LEAGUE = [
  { who: '준호', avatar: '준', books: 18, rank: 2, height: 'h-16' },
  { who: '나', avatar: '나', books: 23, rank: 1, height: 'h-24' },
  { who: '서연', avatar: '서', books: 12, rank: 3, height: 'h-10' },
] as const;

const STEP_COLOR = {
  1: 'stage-blue text-white',
  2: 'stage-mint text-on-mint',
  3: 'bg-primary/15 text-primary',
} as const;

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

export const Highlights = ({ books }: HighlightsProps) => {
  const covers = books.map((b) => b.coverImage).filter(Boolean);
  // 표지가 모자라도 카드마다 같은 표지가 반복되지 않게 순서를 돌려 쓴다
  const pick = (i: number) =>
    covers.length ? covers[i % covers.length] : null;

  return (
    // id: 홈 첫 화면의 "어떻게 쓰나요?"가 여기로 내려온다
    <section
      id='highlights'
      aria-labelledby='highlights-title'
      className='scroll-mt-20 bg-sunken py-24 md:py-32'
    >
      {/* 맛보기(흰 바탕)와 구분선 대신 회색 면으로 나눈다 — 카드는 흰색으로 띄운다(2026-10-25 HJ) */}
      <div className='page-width'>
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
        {/* 차별점(보여 주고 공유하는 독서 명함)을 크게, 기본 기능은 작게 (2026-10-25 홈 개편).
          배지는 첫 줄 바로 아래로 올렸다 — 기록할수록 모이는 보상이라 공유·케미 다음으로 중요하다(2026-10-25 HJ).
          lg(3열): [공유 2칸][케미] / [배지 3칸] / [라운지][주간 회상][인생책]
          md(2열): [공유 2칸] / [케미 2칸] / [배지 2칸] / [라운지][주간 회상] / [인생책 2칸] — 어디서도 빈칸이 없다 */}
        <div className='mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
          <Reveal className='md:col-span-2'>
            <Card
              tone='blue'
              lead='공개 서재와 공유.'
              rest='주소 하나로 내 책장을 보여 주고, 인스타 스토리에 올릴 이미지도 바로 만들어요.'
            >
              {/* items-stretch: 링크 미리보기 카드와 스토리 이미지의 높이를 맞춘다 — 끝이 어긋나 보였다(2026-10-25 HJ) */}
              <div className='flex w-full items-stretch justify-center gap-5 md:gap-8'>
                <div className='flex w-full max-w-xs flex-col overflow-hidden rounded-2xl bg-card shadow-xl'>
                  {/* 실제 공개 서재·링크 미리보기처럼 윗부분은 진한 파랑 */}
                  <div className='stage-blue flex min-h-32 flex-1 items-end gap-1.5 px-4'>
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
                {/* 스토리 이미지(9:16) — 실제 공유 시트가 만드는 이미지(/{username}/story-image)의 구도를 줄여 그린다.
                  위: 파란 머리말(이름·AI 독서 성향·태그) / 아래: 흰 바탕에 책장 한 줄과 올해 권수 */}
                <div className='hidden aspect-9/16 w-36 shrink-0 flex-col overflow-hidden rounded-2xl bg-card shadow-xl sm:flex'>
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
                    <p className='mt-1.5 text-[8px] text-white/80'>
                      #소설 #에세이
                    </p>
                  </div>
                  <div className='flex flex-1 flex-col items-center justify-center gap-1.5 px-2'>
                    <div className='flex items-end gap-0.5'>
                      {[0, 1, 2, 3].map((i) => (
                        <Cover
                          key={i}
                          src={pick(i + 20)}
                          className='w-6 shadow-none'
                          small
                        />
                      ))}
                    </div>
                    <p className='text-[9px] text-text-subtle'>
                      올해 완독한 책
                    </p>
                    <p className='text-2xl font-bold leading-none text-text-strong'>
                      23<span className='text-xs'>권</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={1} className='md:col-span-2 lg:col-span-1'>
            <Card
              tone='mint'
              lead='독서 케미.'
              rest='다른 사람의 책장과 나란히 놓고, 겹치는 책과 취향을 확인해요.'
            >
              <div className='text-center'>
                <p className='text-sm text-on-mint/75'>나 × 혜진</p>
                <p className='text-6xl font-bold'>78%</p>
                <div className='mt-5 flex justify-center gap-2'>
                  {[0, 1, 2, 3].map((i) => (
                    <Cover key={i} src={pick(i + 3)} className='w-12' small />
                  ))}
                </div>
                <p className='mt-3 text-xs text-on-mint/75'>
                  함께 읽은 책 4권 · 둘 다 &lsquo;관계&rsquo;를 좋아해요
                </p>
              </div>
            </Card>
          </Reveal>

          <Reveal className='md:col-span-2 lg:col-span-3'>
            <Card
              wide
              lead='배지.'
              rest='책을 기록할수록 성장·분야·이야기·히든 배지가 작은 전집처럼 모여요. 이미 기록한 책으로도 바로 받아요.'
            >
              <div className='flex w-full flex-col items-center'>
                <ul className='flex flex-wrap items-end justify-center gap-4 md:gap-6'>
                  {BADGES.map((b) => (
                    <li key={b.id}>
                      <BadgeMedal badge={b} size={88} />
                    </li>
                  ))}
                </ul>
                {/* 모바일은 두 줄로 나눠 가운데 정렬 — 한 줄짜리 알약 모양이 어중간하게 꺾이지 않게 */}
                <p className='mt-6 rounded-2xl bg-card px-4 py-2.5 text-center text-sm font-bold text-text-strong shadow-lg sm:rounded-full sm:px-3.5 sm:py-2'>
                  🎉 새 배지를 받았어요
                  <span className='block font-normal text-text-subtle sm:inline'>
                    <span className='hidden sm:inline'> · </span>
                    완독을 저장하면 바로 축하해 드려요
                  </span>
                </p>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card
              lead='라운지.'
              rest='팔로우한 리더와 올해 몇 권 읽었는지 겨루고, 새로 꽂은 책도 바로 봐요.'
            >
              <div className='w-full'>
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
                            : 'bg-card text-text-strong shadow'
                        }`}
                      >
                        {r.avatar}
                      </span>
                      <span className='mt-1.5 text-sm font-bold text-text-strong'>
                        {r.books}권
                      </span>
                      {/* 색은 실제 라운지 시상대를 따른다 — 1등 파랑, 2등 민트(서브 컬러가 눈에 띄어 2등), 3등 연한 파랑(2026-10-25 HJ) */}
                      <span
                        className={`mt-1.5 grid w-full place-items-center rounded-t-lg text-sm font-bold ${r.height} ${STEP_COLOR[r.rank]}`}
                      >
                        {r.rank}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className='mt-4 flex items-center gap-2 rounded-xl bg-sunken px-3.5 py-3 text-sm'>
                  <Cover src={pick(15)} className='w-6 shadow-none' small />
                  <span>
                    <b className='text-text-strong'>준호</b>님이 방금 완독했어요
                  </span>
                </p>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={1}>
            <Card
              lead='주간 회상.'
              rest={
                <>
                  이번 주의 나를 한 장으로 돌아봐요. 홈 화면에 추가하면 알림으로
                  받아요. <InstallGuideLink />
                </>
              }
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

          <Reveal delay={2} className='md:col-span-2 lg:col-span-1'>
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
        </div>
      </div>
    </section>
  );
};
