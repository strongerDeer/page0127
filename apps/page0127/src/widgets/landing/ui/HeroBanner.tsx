'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { cn } from '@/shared/lib/utils';

import type { HeroSlide } from '@/widgets/landing/model/heroSlides';

const AUTOPLAY_MS = 6000;

// prefers-reduced-motion 은 React 밖의 외부 상태다.
// useEffect + setState 로 읽으면 cascading render 가 나므로 useSyncExternalStore 로 구독한다.
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getMotionSnapshot = () => window.matchMedia(MOTION_QUERY).matches;
// 서버에서는 모션을 허용한다고 가정 (클라이언트에서 즉시 정정된다)
const getMotionServerSnapshot = () => false;

type HeroBannerProps = {
  slides: HeroSlide[];
  /** 배너 우측에 세워둘 실제 책 표지 URL — 슬라이드마다 3권씩 나눠 쓴다 */
  covers?: string[];
};

/**
 * 랜딩 히어로 배너 (자동 롤링)
 *
 * 밀리의서재 히어로 구조를 따른다:
 * - 큰 텍스트 하나만 중앙에 띄우는 대신, 배너를 굴린다
 * - 배너 안에 실제 책 표지가 들어간다 (기존 히어로는 이미지가 0개였다)
 *
 * 접근성 (WCAG 2.2.2 — 5초 이상 자동 재생되는 콘텐츠는 멈출 수 있어야 한다):
 * - 일시정지 버튼 제공
 * - 마우스 호버·키보드 포커스 시 자동 정지
 * - prefers-reduced-motion 이면 자동 재생하지 않는다
 */
export const HeroBanner = ({ slides, covers = [] }: HeroBannerProps) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // 사용자가 명시적으로 누른 정지 — 호버가 풀려도 재개하지 않는다
  const [isStopped, setIsStopped] = useState(false);
  const total = slides.length;

  const goTo = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total]
  );

  // 모션 민감 사용자에게는 자동 재생하지 않는다
  const prefersReducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotionSnapshot,
    getMotionServerSnapshot
  );
  const isPlaying = !isPaused && !isStopped && !prefersReducedMotion;

  useEffect(() => {
    if (!isPlaying || total <= 1) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % total),
      AUTOPLAY_MS
    );
    return () => clearInterval(timer);
  }, [isPlaying, total]);

  if (total === 0) return null;

  const current = slides[index];
  // 사용자가 멈췄거나 OS가 모션을 줄이라고 한 상태
  const isAutoplayOff = isStopped || prefersReducedMotion;

  return (
    <section
      aria-roledescription='캐러셀'
      aria-label='주요 소식'
      className='relative overflow-hidden rounded-xl'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        className='relative h-[320px] transition-colors duration-500 md:h-[400px]'
        style={{ backgroundColor: current.bg }}
      >
        {slides.map((slide, i) => {
          const isActive = i === index;
          // 슬라이드마다 다른 표지 세 권을 세운다.
          // 등록된 책이 적으면 앞에서부터 다시 채운다 — 배너가 비는 것보다 낫다.
          const slideCovers =
            covers.length === 0
              ? []
              : Array.from(
                  { length: Math.min(3, covers.length) },
                  (_, k) => covers[(i * 3 + k) % covers.length]
                );

          return (
            <div
              key={slide.id}
              role='group'
              aria-roledescription='슬라이드'
              aria-label={`${i + 1} / ${total}`}
              aria-hidden={!isActive}
              className={cn(
                'absolute inset-0 flex items-center transition-opacity duration-500',
                isActive
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0'
              )}
            >
              <div className='mx-auto flex w-full max-w-6xl items-center justify-between gap-8 px-8 md:px-12'>
                {/* 카피 */}
                <div className='max-w-md' style={{ color: slide.fg }}>
                  <p className='mb-4 text-[13px] font-medium opacity-70'>
                    {slide.eyebrow}
                  </p>
                  <h2 className='text-[28px] font-bold leading-[1.35] md:text-[36px] md:leading-[1.3]'>
                    {slide.lines[0]}
                    <br />
                    {slide.lines[1]}
                  </h2>
                  <p className='mt-4 break-keep text-sm opacity-80 md:text-base'>
                    {slide.sub}
                  </p>
                  <Link
                    href={slide.href}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() =>
                      trackEvent('cta_click', {
                        location: 'hero_banner',
                        label: slide.cta,
                      })
                    }
                    className='mt-6 inline-flex h-10 items-center rounded-md bg-white px-5 text-sm font-medium text-text-strong transition-opacity hover:opacity-90'
                  >
                    {slide.cta}
                  </Link>
                </div>

                {/* 실제 책 표지 — 선반에 세워둔다.
                    판형을 크롭하지 않는다: 높이만 고정하고 너비는 원본 비율대로 둔다.
                    문고본과 양장본은 실제로 판형이 다르고, 그 불균일이 "진짜 책"의 증거다. */}
                {slideCovers.length > 0 && (
                  <div className='hidden items-end gap-3 md:flex'>
                    {slideCovers.map((cover, ci) => (
                      <div
                        key={`${slide.id}-${ci}`}
                        className='relative shrink-0'
                        style={{
                          // 가운데 책을 살짝 올려 진열대처럼 보이게 한다
                          transform: ci === 1 ? 'translateY(-14px)' : undefined,
                        }}
                      >
                        <Image
                          src={cover}
                          alt=''
                          width={300}
                          height={430}
                          sizes='(min-width: 1024px) 220px, 180px'
                          // 첫 슬라이드의 표지는 폴드 위 LCP 요소다 — 지연 로딩하면 안 된다
                          priority={i === 0}
                          className='h-45 w-auto rounded-r-md lg:h-55'
                        />
                        {/* 좌측 책등 — 종이 두께 */}
                        <span
                          aria-hidden
                          className='absolute inset-y-0 left-0 w-2'
                          style={{
                            backgroundImage:
                              'linear-gradient(to right, rgba(0,0,0,.28) 0px, rgba(0,0,0,.08) 4px, transparent 8px)',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 컨트롤 — 우하단 */}
        <div className='absolute bottom-5 right-5 flex items-center gap-1 rounded-full bg-black/30 px-2 py-1 text-white backdrop-blur-sm md:right-8'>
          <button
            type='button'
            onClick={() => goTo(index - 1)}
            aria-label='이전 배너'
            className='flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/20'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>

          <span
            className='px-1 text-xs tabular-nums'
            aria-live='polite'
            aria-atomic='true'
          >
            {index + 1} / {total}
          </span>

          <button
            type='button'
            onClick={() => goTo(index + 1)}
            aria-label='다음 배너'
            className='flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/20'
          >
            <ChevronRight className='h-4 w-4' />
          </button>

          <button
            type='button'
            onClick={() => setIsStopped((s) => !s)}
            aria-label={
              isAutoplayOff ? '배너 자동 넘김 재생' : '배너 자동 넘김 정지'
            }
            className='ml-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/20'
          >
            {isAutoplayOff ? (
              <Play className='h-3.5 w-3.5' />
            ) : (
              <Pause className='h-3.5 w-3.5' />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
