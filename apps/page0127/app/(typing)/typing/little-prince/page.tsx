import Image from 'next/image';
import Link from 'next/link';

import {
  TypingProgressCard,
  TypingRankingCard,
  TypingRoom,
} from '@/features/typing';
import { getTypingState } from '@/features/typing/api/getTypingState';

import type { Metadata } from 'next';

/**
 * /typing/little-prince — 『어린 왕자』 온라인 필사 (HJ, 2026-11-25)
 *
 * 옛날 한글 타자 연습으로 쳐 보던 그 책을, 이번엔 필사로. 전문 이어 쓰기 · 장 고르기 · 명문장만.
 * 바깥(머리글·소개·진행도·랭킹)은 page0127. 디자인 그대로, 가운데 필사 창 하나만 레트로 프로그램 모양이다.
 * 오늘의 문장(/sentence)처럼 사이트 GNB 없이 전용 머리글만 둔다 — 이 페이지만 써도 되는 형태.
 *
 * 기록은 로그인한 계정만 남는다. 비회원도 쳐 볼 수는 있다.
 */
const PATH = '/typing/little-prince';
const LOGIN_HREF = `/login?next=${encodeURIComponent(PATH)}`;

export const metadata: Metadata = {
  title: '『어린 왕자』 온라인 필사',
  description:
    '그때 그 타자 연습처럼, 이번엔 필사로. 『어린 왕자』를 한 쪽씩 따라 쳐 보세요. 전문 이어 쓰기, 장 고르기, 명문장만 쓰기를 고를 수 있어요.',
  alternates: { canonical: PATH },
};

const TypingLittlePrincePage = async () => {
  const state = await getTypingState();
  const doneKeys = state.records.map((r) => r.page_key);

  return (
    <div className='min-h-svh bg-background'>
      <header className='relative z-10 flex items-center justify-between gap-3 border-b border-line-soft bg-card px-4 py-3 sm:px-6'>
        <Link
          href='/'
          className='flex items-center gap-2.5 text-text-strong'
          aria-label='page0127 홈으로'
        >
          <Image
            src='/brand/app-icon-96.webp'
            alt=''
            width={28}
            height={28}
            unoptimized
            className='size-7'
          />
          <span className='text-lg font-bold text-primary'>page0127.</span>
          <span aria-hidden className='h-4 w-px bg-line-soft' />
          <span className='text-base font-bold'>온라인 필사</span>
        </Link>
        <Link
          href={state.memberId ? (state.libraryHref ?? '/') : LOGIN_HREF}
          className='rounded-lg px-2.5 py-1.5 text-sm text-text-subtle hover:bg-accent hover:text-text-strong'
        >
          {state.memberId ? '내 서재' : '로그인'}
        </Link>
      </header>

      <main className='mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12'>
        <section
          className='relative overflow-hidden rounded-3xl border border-line-soft px-6 py-8 sm:px-10 sm:py-10'
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--tint-warm-from), var(--tint-warm-to))',
          }}
        >
          <p className='inline-flex rounded-full bg-card/80 px-3 py-1 text-xs font-bold text-primary'>
            키보드로 하는 필사
          </p>
          <h1 className='mt-3 text-3xl font-bold leading-tight tracking-tight text-text-strong text-balance sm:text-4xl'>
            『어린 왕자』 온라인 필사
          </h1>
          <p className='mt-3 max-w-2xl text-base leading-relaxed text-text-body'>
            그때 그 타자 연습처럼, 이번엔 필사로. 파란 줄을 보고 바로 아래에
            똑같이 따라 쳐 보세요. 처음부터 이어 써도, 장을 골라도, 명문장만
            짧게 써도 좋아요.
          </p>
          <ul className='mt-5 flex flex-wrap gap-2 text-sm'>
            {[
              '전문 27장 · 지금 1~6장 공개',
              '쪽마다 도트 그림',
              '로그인하면 진행도·랭킹 기록',
            ].map((item) => (
              <li
                key={item}
                className='rounded-full border border-line-soft bg-card/70 px-3 py-1 text-text-body'
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <TypingRoom
          memberId={state.memberId}
          initialDoneKeys={doneKeys}
          loginHref={LOGIN_HREF}
        />

        <div className='grid gap-6 md:grid-cols-2'>
          <TypingProgressCard
            doneKeys={doneKeys}
            memberId={state.memberId}
            loginHref={LOGIN_HREF}
          />
          <TypingRankingCard
            memberId={state.memberId}
            rankOptIn={state.rankOptIn}
            rankings={state.rankings}
            loginHref={LOGIN_HREF}
          />
        </div>

        <p className='text-xs leading-relaxed text-text-subtle'>
          본문은 앙투안 드 생텍쥐페리 『어린 왕자』(1943) 프랑스어 원문을
          page0127.이 직접 옮겼어요. 원작은 한국에서 저작권 보호 기간이
          끝났어요. 그림은 원작 삽화가 아니라 page0127.이 그린 도트
          그림이에요. 타수는 한글 자판을 누른 횟수(겹받침·이중모음은 2타)로
          세요.
        </p>
      </main>
    </div>
  );
};

export default TypingLittlePrincePage;
