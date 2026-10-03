import Link from 'next/link';

import { Button } from '@repo/ui';

import { type ShelfBook, splitCoverRows } from '../model/coverRows';
import { CoverMarquee } from './CoverMarquee';
import { Reveal } from './Reveal';

import styles from './AboutHero.module.css';

type AboutHeroProps = { books: ShelfBook[] };

const ROLLING_WORDS = ['취향이', '계절이', '마음이'] as const;

export const AboutHero = ({ books }: AboutHeroProps) => {
  const rows = splitCoverRows(books);

  return (
    <section aria-labelledby='about-title' className='pt-24 md:pt-28'>
      <div className='mx-auto max-w-6xl px-4 text-center'>
        <p className='text-sm font-bold text-primary'>
          독서 기록 서비스, page0127.
        </p>
        <h1 id='about-title' className='display-xl mt-4 text-balance'>
          책장을 보면
          <br />그 사람의{' '}
          {/* 스크린리더·검색엔진은 고정 문장을 읽는다 — 계속 바뀌는 글자를 읽히면 혼란스럽다 */}
          <span className='sr-only'>{ROLLING_WORDS[0]}</span>
          <span aria-hidden='true' className={`${styles.roll} text-primary`}>
            {[...ROLLING_WORDS, ROLLING_WORDS[0]].map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </span>{' '}
          보인다
        </h1>
        <p className='mx-auto mt-5 max-w-md text-balance text-base text-text-subtle'>
          읽은 책을 꽂아 두기만 하세요. 쌓인 책장이 당신을 이야기해 줍니다.
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-2.5'>
          <Button asChild size='lg'>
            <Link href='/login'>10초 만에 시작하기</Link>
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
