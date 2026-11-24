'use client';

import Link from 'next/link';

import { BookCover, Button } from '@repo/ui';
import { ArrowRight } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { toCoverSource } from '@/entities/book';

import type { Book } from '@/entities/book';

/**
 * 남의 공개 서재에 들어온 비로그인 방문자를 위한 가입 길.
 *
 * 공유 링크로 들어온 사람이 실제 유입인데 예전엔 "나도 만들기" 류의 길이 없었다.
 * - 페이지 끝: 다 본 사람에게 다음 행동을 준다
 * (프로필 아래 "독서 케미는?" 카드는 2026-11-24 상단 배너 LibraryFeatureBanner 로 옮겼다)
 * 하단 고정 바는 쓰지 않는다 — 구경하며 읽는 화면을 계속 가리고, 헤더의 [시작하기]가 이미 따라다닌다.
 * 하단 가입 배너는 홈의 맛보기(고르고 → 저장 → 로그인)로 보낸다.
 */

type VisitorSignupBannerProps = {
  name: string;
  /** 주인 책장의 최근 완독 표지 — 앞 3장만 그린다 */
  covers: Book[];
};

/** 부채꼴 3장의 기울기·위치 (왼쪽부터) */
const FAN = [
  { left: 0, rotate: -8 },
  { left: 56, rotate: -2 },
  { left: 112, rotate: 4 },
];

/**
 * 페이지 끝 가입 배너.
 * 가운데 글자만 있던 남색 띠 → 왼쪽 문구·버튼, 오른쪽에 주인 책장의 표지 3장 + 점선 "내 책" 자리.
 * "남의 책장 → 내 책장"이 그림으로 읽히게 한다.
 */
export const VisitorSignupBanner = ({
  name,
  covers,
}: VisitorSignupBannerProps) => {
  const fan = covers.slice(0, FAN.length);

  return (
    <section
      aria-labelledby='visitor-signup-title'
      className={`band-strong grid items-center gap-8 overflow-hidden rounded-3xl px-6 py-9 sm:px-10 ${
        fan.length > 0 ? 'md:grid-cols-[1fr_300px]' : ''
      }`}
    >
      <div className='order-2 md:order-1'>
        <p className='text-sm font-semibold text-white/60'>
          책장을 보면, 그 사람이 보인다
        </p>
        <h2 id='visitor-signup-title' className='heading-2 mt-1 text-white'>
          나도 내 책장 만들기
        </h2>
        <p className='mt-2 break-keep text-sm text-white/75'>
          {name}님처럼 읽은 책을 꽂아 두면 책장이 취향을 말해 줘요. 무료 ·
          30초면 첫 책장이 생겨요
        </p>
        <Button
          asChild
          size='lg'
          className='mt-5 gap-2 bg-white px-7 text-[color:var(--navy-900)] hover:bg-white/90'
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
      </div>

      {/* 좁은 화면(≤360px)에선 284px 부채꼴이 띠 안쪽(약 240px)보다 넓다 → 0.8배로.
          scale 은 차지하는 칸을 줄이지 않으므로 바깥 칸(227×115)을 따로 잡는다 */}
      {fan.length > 0 && (
        <div className='order-1 mx-auto h-[115px] w-[227px] sm:h-36 sm:w-[284px] md:order-2'>
          <div
            aria-hidden
            className='relative h-36 w-[284px] origin-top-left scale-80 sm:scale-100'
          >
            {fan.map((book, i) => (
              <span
                key={book.id}
                data-fan-cover
                className='absolute bottom-0 block h-[124px] w-[84px] border-2 border-white/90 shadow-[0_14px_28px_rgba(0,0,0,0.35)]'
                style={{
                  left: FAN[i].left,
                  transform: `rotate(${FAN[i].rotate}deg)`,
                }}
              >
                <BookCover
                  {...toCoverSource(book)}
                  title={book.title}
                  decorative
                  size='fill'
                  sizes='84px'
                  // 흰 테두리 부채꼴 — 틀이 그림이라 표지가 틀을 꽉 채워야 한다
                  fit='cover'
                  // 84px 부채꼴 — 소개 페이지 표지 띠와 같은 폭이라 같은 이유로 M 고정
                  small
                />
              </span>
            ))}
            <span className='absolute bottom-0 right-0 flex h-[124px] w-[84px] flex-col items-center justify-center rounded-[3px_6px_6px_3px] border-2 border-dashed border-white/60 text-xs text-white/85'>
              <span className='text-xl leading-none'>+</span>내 책
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
