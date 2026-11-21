import Link from 'next/link';

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
} from '@/widgets/about/model/serviceIntro';
import { DocList, DocPage, DocSection } from '@/widgets/landing/ui/DocPage';

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

const linkClass = 'underline underline-offset-4';

/**
 * 서비스 소개 — 사람과 검색엔진·AI가 "page0127.은 무엇인가"를 한 번에 읽는 평평한 글.
 *
 * 2026-10-25 소개를 홈에 합치며 /about 은 /updates 로 보냈다. 홈은 "한 권의 책" 연출이라
 * 사람에게는 좋지만, 은유 문장이 많아 AI가 인용할 정의 문장이 없었다(2026-11-21 점검).
 * 그래서 연출은 홈에 두고, 설명만 담은 페이지를 다시 연다(HJ 결정: 방법 A).
 *
 * 학습 포인트:
 * - (static) 그룹이라 쿠키를 읽지 않는다 → 빌드 때 HTML 로 만들어 CDN 에서 바로 나간다.
 *   크롤러는 자바스크립트를 잘 돌리지 않으므로, 본문이 처음 HTML 에 다 들어 있는 게 중요하다.
 * - 화면 글과 JSON-LD 가 같은 배열(serviceIntro.ts)에서 나온다 → 둘이 어긋날 일이 없다.
 */
const AboutPage = () => (
  // break-keep: 한국어를 단어 단위로 줄바꿈한다
  <div className='break-keep'>
    <JsonLd data={webApplicationJsonLd} />
    <JsonLd data={faqPageJsonLd} />

    <DocPage title='page0127. 소개' description={SERVICE_DEFINITION}>
      <DocSection title='한눈에 보기'>
        <DocList items={[...SERVICE_FACTS]} />
      </DocSection>

      <DocSection title='무엇을 할 수 있나요'>
        <dl className='space-y-4'>
          {SERVICE_FEATURES.map((feature) => (
            <div key={feature.title}>
              <dt className='font-medium text-text-strong'>{feature.title}</dt>
              <dd className='mt-1'>{feature.description}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection title='자주 묻는 질문'>
        <dl className='space-y-4'>
          {SERVICE_FAQ.map((faq) => (
            <div key={faq.question}>
              <dt className='font-medium text-text-strong'>{faq.question}</dt>
              <dd className='mt-1'>{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </DocSection>

      <DocSection title='둘러보기'>
        <p>
          가입하지 않아도{' '}
          <Link href='/books/all' className={linkClass}>
            전체 도서
          </Link>
          와 책 정보를 볼 수 있어요. 새로 생긴 기능은{' '}
          <Link href='/updates' className={linkClass}>
            공지·업데이트
          </Link>
          에 날짜순으로 모아 두었어요.
        </p>
        <Link
          href='/login'
          className='mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
        >
          내 책장 만들어 보기
        </Link>
      </DocSection>
    </DocPage>
  </div>
);

export default AboutPage;
