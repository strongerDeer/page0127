import Link from 'next/link';

import { PageContainer } from '@repo/ui';
import {
  ArrowRight,
  Award,
  BookPlus,
  CalendarDays,
  ChevronDown,
  Quote,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';

import { JsonLd } from '@/shared/lib/seo/JsonLd';
import {
  buildFaqPageJsonLd,
  buildWebApplicationJsonLd,
} from '@/shared/lib/seo/structuredData';

import {
  SERVICE_DEFINITION,
  SERVICE_FACTS,
  SERVICE_FAQ,
  SERVICE_FEATURES,
  SERVICE_NAME,
  type ServiceFeatureId,
} from '@/widgets/about/model/serviceIntro';

import type { LucideIcon } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '서비스 소개 | page0127.',
  description: SERVICE_DEFINITION,
  alternates: { canonical: '/about' },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const webApplicationJsonLd = buildWebApplicationJsonLd({
  name: SERVICE_NAME,
  url: siteUrl,
  description: SERVICE_DEFINITION,
});

const faqPageJsonLd = buildFaqPageJsonLd(SERVICE_FAQ);

/** 기능 id → 아이콘. Record 라서 기능을 하나 추가하면 여기서 타입 에러가 나 빠뜨리지 않는다 */
const FEATURE_ICONS: Record<ServiceFeatureId, LucideIcon> = {
  record: BookPlus,
  ai: Sparkles,
  sentence: Quote,
  calendar: CalendarDays,
  share: Share2,
  chemistry: Users,
  badge: Award,
};

const tintSquare =
  'grid size-10 shrink-0 place-items-center rounded-xl border border-line-soft bg-gradient-to-b from-[var(--tint-blue-from)] to-[var(--tint-blue-to)] text-primary';

const primaryButton =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90';

const secondaryButton =
  'inline-flex items-center gap-2 rounded-lg border border-line px-5 py-3 text-sm font-medium text-text-strong transition-colors hover:bg-muted';

/** 절 제목 — 위에 작은 영문 없이, 한 줄 설명만 붙인다 */
const SectionTitle = ({ title, lead }: { title: string; lead: string }) => (
  <header className='mb-5'>
    <h2 className='heading-2'>{title}</h2>
    <p className='mt-1 text-sm text-text-subtle'>{lead}</p>
  </header>
);

/**
 * 서비스 소개 — 사람과 검색엔진·AI가 "page0127.은 무엇인가"를 한 번에 읽는 페이지.
 *
 * 2026-10-25 소개를 홈에 합치며 /about 은 /updates 로 보냈다. 홈은 "한 권의 책" 연출이라
 * 사람에게는 좋지만, 은유 문장이 많아 AI가 인용할 정의 문장이 없었다(2026-11-21 점검).
 * 그래서 연출은 홈에 두고, 설명만 담은 페이지를 다시 연다(HJ 결정: 방법 A).
 *
 * 가독성(2026-11-21 HJ 요청): 글 덩어리 대신 훑어 읽는 구조로 —
 * 정의 문장(크게) → 사실 카드 4장 → 기능 카드(아이콘+제목+두 줄) → 질문 아코디언 → 마무리 버튼.
 *
 * 학습 포인트:
 * - (static) 그룹이라 쿠키를 읽지 않는다 → 빌드 때 HTML 로 만들어 CDN 에서 바로 나간다.
 * - FAQ 를 <details> 로 접어도 답은 처음 HTML 에 들어 있다 → 크롤러는 다 읽고,
 *   JSON-LD 의 "화면에 보이는 내용과 같아야 한다" 규칙도 지킨다(펼치면 보이므로).
 *   자바스크립트 없이 열고 닫혀서 클라이언트 컴포넌트가 필요 없다.
 * - 화면 글과 JSON-LD 가 같은 배열(serviceIntro.ts)에서 나온다 → 둘이 어긋날 일이 없다.
 */
const AboutPage = () => (
  // break-keep: 한국어를 단어 단위로 줄바꿈한다
  <PageContainer className='break-keep'>
    <JsonLd data={webApplicationJsonLd} />
    <JsonLd data={faqPageJsonLd} />

    <div className='mx-auto max-w-3xl space-y-14 pb-16 pt-4'>
      {/* 1. 정의 문장 — AI가 인용할 문장이라 페이지에서 가장 크게 */}
      <header className='space-y-5'>
        <p className='text-sm font-medium text-primary'>서비스 소개</p>
        <h1 className='heading-1'>{SERVICE_NAME}</h1>
        <p className='text-lg leading-relaxed text-text-body sm:text-xl'>
          {SERVICE_DEFINITION}
        </p>
        <div className='flex flex-wrap gap-3 pt-1'>
          <Link href='/login' className={primaryButton}>
            내 책장 만들어 보기
            <ArrowRight aria-hidden className='size-4' />
          </Link>
          <Link href='/books/all' className={secondaryButton}>
            전체 도서 둘러보기
          </Link>
        </div>
      </header>

      {/* 2. 한눈에 보기 — 라벨·값·짧은 설명을 같은 자리에 둔 카드 */}
      <section aria-labelledby='about-facts'>
        <h2 id='about-facts' className='sr-only'>
          한눈에 보기
        </h2>
        <dl className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {SERVICE_FACTS.map((fact) => (
            <div
              key={fact.label}
              className='rounded-2xl border border-line-soft bg-card p-4'
            >
              <dt className='text-xs text-text-subtle'>{fact.label}</dt>
              <dd className='mt-1 font-semibold text-text-strong'>
                {fact.value}
              </dd>
              <dd className='mt-1 text-xs leading-snug text-text-subtle'>
                {fact.note}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3. 기능 — 아이콘으로 먼저 훑고, 궁금한 것만 두 줄 읽게.
          개수가 홀수면 마지막 카드가 두 칸을 채워 한 칸만 비는 줄을 만들지 않는다 */}
      <section>
        <SectionTitle
          title='무엇을 할 수 있나요'
          lead='읽은 책을 담으면 기록·분석·공유가 한곳에서 이어져요.'
        />
        <ul className='grid gap-3 sm:grid-cols-2'>
          {SERVICE_FEATURES.map((feature) => {
            const Icon = FEATURE_ICONS[feature.id];
            return (
              <li
                key={feature.id}
                className='flex gap-4 rounded-2xl border border-line-soft bg-card p-5 sm:odd:last:col-span-2'
              >
                <span className={tintSquare}>
                  <Icon aria-hidden className='size-5' />
                </span>
                <div className='min-w-0'>
                  <h3 className='font-semibold text-text-strong'>
                    {feature.title}
                  </h3>
                  <p className='mt-1 text-sm leading-relaxed text-text-body'>
                    {feature.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4. 자주 묻는 질문 — 질문만 훑고 필요한 답만 펼친다 */}
      <section>
        <SectionTitle
          title='자주 묻는 질문'
          lead='질문을 누르면 답이 펼쳐져요.'
        />
        <div className='divide-y divide-line-soft rounded-2xl border border-line-soft bg-card'>
          {SERVICE_FAQ.map((faq, i) => (
            <details key={faq.question} className='group' open={i === 0}>
              <summary className='flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-text-strong [&::-webkit-details-marker]:hidden'>
                {faq.question}
                <ChevronDown
                  aria-hidden
                  className='size-4 shrink-0 text-text-subtle transition-transform group-open:rotate-180'
                />
              </summary>
              <p className='px-5 pb-5 text-sm leading-relaxed text-text-body'>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* 5. 마무리 — 큰 면은 tint 그라데이션 + 1px 선(민트 면 X) */}
      <section className='rounded-2xl border border-line-soft bg-gradient-to-b from-[var(--tint-blue-from)] to-[var(--tint-blue-to)] p-6 sm:p-8'>
        <h2 className='heading-2'>오늘 읽은 한 권부터 꽂아 보세요</h2>
        <p className='mt-2 text-sm text-text-body'>
          새로 생긴 기능은{' '}
          <Link href='/updates' className='underline underline-offset-4'>
            공지·업데이트
          </Link>
          에 날짜순으로 모아 두었어요.
        </p>
        <Link href='/login' className={`${primaryButton} mt-5`}>
          무료로 시작하기
          <ArrowRight aria-hidden className='size-4' />
        </Link>
      </section>
    </div>
  </PageContainer>
);

export default AboutPage;
