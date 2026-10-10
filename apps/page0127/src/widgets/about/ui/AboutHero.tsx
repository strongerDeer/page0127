import Link from 'next/link';

import { Button } from '@repo/ui';

import { type ShelfBook, splitCoverRows } from '../model/coverRows';
import { CoverMarquee } from './CoverMarquee';
import { Reveal } from './Reveal';

import styles from './AboutHero.module.css';

type AboutHeroProps = { books: ShelfBook[] };

// 홈 히어로("책장을 보면, 그 사람이 보인다.")와 겹치지 않게 문장을 바꾸고,
// 돌아가는 단어 효과만 살렸다. 소개는 "체험"이 아니라 "이해"를 맡는다.
const ROLLING_WORDS = ['취향을', '계절을', '마음을'] as const;

export const AboutHero = ({ books }: AboutHeroProps) => {
  const rows = splitCoverRows(books);

  return (
    <section aria-labelledby='about-title' className='pt-24 md:pt-28'>
      <div className='mx-auto max-w-6xl px-4 text-center'>
        <p className='text-sm font-bold text-primary'>
          독서 기록 서비스, page0127.
        </p>
        <h1 id='about-title' className='display-xl mt-4 text-balance'>
          읽은 책을 꽂아 두면,
          <br />
          책장이{' '}
          {/* 스크린리더·검색엔진은 고정 문장을 읽는다 — 계속 바뀌는 글자를 읽히면 혼란스럽다 */}
          <span className='sr-only'>{ROLLING_WORDS[0]}</span>
          <span aria-hidden='true' className={`${styles.roll} text-primary`}>
            {[...ROLLING_WORDS, ROLLING_WORDS[0]].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </span>{' '}
          말해 줍니다
        </h1>
        <p className='mx-auto mt-5 max-w-md text-balance text-base text-text-subtle'>
          한 권 꽂는 데 10초, 별점을 남긴 다섯 권이 모이면 취향 노트가 나와요.
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-2.5'>
          {/* 로그인으로 바로 보내지 않는다 — 고르고 책장이 서는 체험은 홈에 있다 */}
          <Button asChild size='lg'>
            <Link href='/'>내 책장 만들어 보기</Link>
          </Button>
          <Button asChild size='lg' variant='secondary'>
            <Link href='#steps'>어떻게 쓰나요?</Link>
          </Button>
        </div>
      </div>

      {rows && (
        <Reveal delay={2}>
          <div className='stage-blue mx-4 mt-16 overflow-hidden rounded-3xl py-12 shadow-xl md:mx-auto md:max-w-6xl'>
            <p className='mb-9 flex items-center justify-center gap-2.5 text-sm font-bold text-white'>
              <span
                aria-hidden='true'
                className='size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none'
              />
              방금 page0127.에 꽂힌 책
              <span className='font-normal text-white/70'>· 최근 등록 순</span>
            </p>
            <CoverMarquee rows={rows} />
          </div>
        </Reveal>
      )}
    </section>
  );
};
