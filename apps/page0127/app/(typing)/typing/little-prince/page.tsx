import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildFaqPageJsonLd } from '@/shared/lib/seo/structuredData';

import { LITTLE_PRINCE_FAQ } from '@/entities/typing';

import {
  TypingBookIntro,
  TypingProgressCard,
  TypingRankingCard,
  TypingRoom,
} from '@/features/typing';
import { getTypingState } from '@/features/typing/api/getTypingState';

import { StandaloneShell } from '@/widgets/StandaloneShell';

import type { Metadata } from 'next';

/**
 * /typing/little-prince — 『어린 왕자』 온라인 필사 (HJ, 2026-11-25)
 *
 * 옛날 한글 타자 연습으로 쳐 보던 그 책을, 이번엔 필사로. 명문장만(기본) · 전문 이어 쓰기 · 장 고르기.
 * 바깥(머리글·소개·진행도·랭킹)은 page0127. 디자인 그대로, 가운데 필사 창 하나만 레트로 프로그램 모양이다.
 * 오늘의 문장(/sentence)처럼 사이트 GNB 없이 전용 머리글만 둔다 — 이 페이지만 써도 되는 형태.
 *
 * 진행도는 로그인한 계정만 남는다. 비회원도 쳐 볼 수 있고, 닉네임으로 타수 랭킹에는 오를 수 있다(HJ 2026-11-26).
 */
const PATH = '/typing/little-prince';
const LOGIN_HREF = `/login?next=${encodeURIComponent(PATH)}`;

const TITLE = '『어린 왕자』 온라인 필사 · 긴 글 타자 연습';
const DESCRIPTION =
  '『어린 왕자』를 한 쪽씩 따라 치는 온라인 필사이자 한글 긴 글 타자 연습이에요. 타수·정확도를 재고, 명문장만 짧게 쓰거나, 처음부터 이어 쓰거나, 장을 골라 쓸 수 있어요. 로그인하면 진행도와 랭킹이 남아요.';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    '어린 왕자 필사',
    '어린 왕자 온라인 필사',
    '어린왕자 필사',
    '어린왕자 온라인 필사',
    '온라인 필사',
    '필사 사이트',
    '타자 연습',
    '한글 타자 연습',
    '긴 글 타자 연습',
    '타수 측정',
    '어린 왕자',
    '생텍쥐페리',
  ],
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    url: PATH,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

/**
 * 구조화 데이터 — "이 페이지는 『어린 왕자』(Book)를 다루는 무료 웹 도구"라고 알린다.
 * FAQ 는 화면에 보이는 질문·답과 같은 배열(LITTLE_PRINCE_FAQ)을 쓴다.
 */
const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: TITLE,
  url: `${siteUrl}${PATH}`,
  description: DESCRIPTION,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko-KR',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  about: {
    '@type': 'Book',
    name: '어린 왕자',
    alternateName: 'Le Petit Prince',
    author: { '@type': 'Person', name: '앙투안 드 생텍쥐페리' },
    datePublished: '1943',
    inLanguage: 'fr',
  },
};
const faqJsonLd = buildFaqPageJsonLd(LITTLE_PRINCE_FAQ);

const TypingLittlePrincePage = async () => {
  const state = await getTypingState();
  const doneKeys = state.records.map((r) => r.page_key);

  return (
    <StandaloneShell
      title='온라인 필사'
      loginHref={LOGIN_HREF}
      emphasizeLogin
      bodyClassName='bg-background'
    >
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      <main className='mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12'>
        <section className='px-2 pt-2 text-center sm:pt-4'>
          <p className='inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary'>
            {/* 재미 요소(HJ 2026-11-26): 타자 연습을 지우고 필사라고 우긴다 */}
            <s className='mr-1 font-medium text-text-muted decoration-2'>
              타자 연습
            </s>
            온라인 필사라고 우겨 봅니다
          </p>
          <h1 className='mt-3 text-3xl font-bold leading-tight tracking-tight text-text-strong text-balance sm:text-4xl'>
            『어린 왕자』 온라인 필사
          </h1>
          <p className='mx-auto mt-3 max-w-2xl break-keep text-base leading-relaxed text-text-body text-balance'>
            그때 그 타자 연습처럼, 이번엔 필사로. 파란 줄을 보고 바로 아래에
            똑같이 따라 쳐 보세요. 명문장 한 대목부터 가볍게 시작하고, 처음부터
            이어 써도, 장을 골라 써도 좋아요.
          </p>
        </section>

        <TypingRoom
          memberId={state.memberId}
          rankOptIn={state.rankOptIn}
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
            // 결과 창에서 순위 참여를 켜면 새로 고친 값으로 스위치를 다시 그린다
            key={String(state.rankOptIn)}
            memberId={state.memberId}
            rankOptIn={state.rankOptIn}
            rankings={state.rankings}
            loginHref={LOGIN_HREF}
          />
        </div>

        <TypingBookIntro />
      </main>
    </StandaloneShell>
  );
};

export default TypingLittlePrincePage;
