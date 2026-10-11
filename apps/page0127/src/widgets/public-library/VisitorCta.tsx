'use client';

import Link from 'next/link';

import { Button } from '@repo/ui';
import { ArrowRight, ChevronRight } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

/**
 * 남의 공개 서재에 들어온 비로그인 방문자를 위한 가입 길.
 *
 * 공유 링크로 들어온 사람이 실제 유입인데 예전엔 "나도 만들기" 류의 길이 없었다.
 * - 프로필 바로 아래: 구경하며 생기는 호기심("이 사람과 나는?")을 건드린다
 * - 페이지 끝: 다 본 사람에게 다음 행동을 준다
 * 하단 고정 바는 쓰지 않는다 — 구경하며 읽는 화면을 계속 가리고, 헤더의 [시작하기]가 이미 따라다닌다.
 * 둘 다 로그인 대신 홈의 맛보기로 보낸다(고르고 → 저장 → 로그인 흐름이 거기 있다).
 */

type VisitorCtaProps = {
  /** 서재 주인의 표시 이름 */
  name: string;
};

export const VisitorChemiCard = ({ name }: VisitorCtaProps) => (
  <Link
    href='/'
    onClick={() =>
      trackEvent('cta_click', { location: 'library_chemi', label: '독서 케미' })
    }
    className='flex items-center gap-3 rounded-2xl border border-primary/25 bg-card px-5 py-4 transition hover:border-primary/50 hover:shadow-sm'
  >
    <span className='min-w-0 flex-1'>
      <span className='block break-keep font-bold text-text-strong'>
        {name}님과 나, 독서 케미는?
      </span>
      <span className='mt-0.5 block break-keep text-sm text-text-subtle'>
        읽은 책을 골라 내 책장부터 만들어 보세요
      </span>
    </span>
    <ChevronRight aria-hidden='true' className='size-5 shrink-0 text-primary' />
  </Link>
);

export const VisitorSignupBanner = ({ name }: VisitorCtaProps) => (
  <section
    aria-labelledby='visitor-signup-title'
    className='band-strong flex flex-col items-center gap-3 rounded-2xl px-6 py-10 text-center'
  >
    <h2 id='visitor-signup-title' className='heading-2 text-white'>
      나도 내 책장 만들기
    </h2>
    <p className='break-keep text-sm text-white/75'>
      {name}님처럼 읽은 책을 꽂아 두면 책장이 취향을 말해 줘요. 무료 · 30초
    </p>
    <Button
      asChild
      size='lg'
      className='mt-2 gap-2 bg-white px-8 text-[color:var(--navy-900)] hover:bg-white/90'
    >
      <Link
        href='/'
        onClick={() =>
          trackEvent('cta_click', {
            location: 'library_bottom',
            label: '내 책장 만들기',
          })
        }
      >
        내 책장 만들기
        <ArrowRight aria-hidden='true' className='size-4' />
      </Link>
    </Button>
  </section>
);
