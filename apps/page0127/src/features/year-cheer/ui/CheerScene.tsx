'use client';

import { useRef, useState } from 'react';

import Link from 'next/link';

import { cn } from '@repo/ui';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { CHEER_YEAR, type CheerSentence } from '@/entities/year-cheer';

import { ShareButton, ShareSheetButton } from '@/features/share';

import { openYearCheerAction } from '../api/openYearCheerAction';

import styles from './CheerScene.module.css';

/** 리본이 다 풀린 뒤에 뒤집는다 — CSS 리본 transition(0.4s)과 맞춘다 */
const UNTIE_MS = 420;

const CHEER_STORY_LOADING = {
  title: '응원 카드를 그리는 중이에요',
  wait: '선물 포장지를 고르고 있어요',
  slow: '조금만 더 기다려 주세요',
};

type CheerSceneProps = {
  /** 서재 주인 이름(표시용) */
  name: string;
  /** 서재 주인 아이디 — 공유 주소에 쓴다 */
  username: string;
  /** 지금 보는 사람이 주인인가 */
  isOwner: boolean;
  /** 보는 사람의 아이디 — 친구가 로그인해 있으면 "내 응원 받으러 가기"로 보낸다 */
  viewerUsername: string | null;
  /** 첫 줄(올해 끝까지 읽은 책 수) */
  firstLine: string;
  /** 이미 연 문장 — 안 열었으면 null */
  initialSentence: CheerSentence | null;
};

type Phase = 'closed' | 'untying' | 'open';

/**
 * 연말 응원 카드 — 선물 리본 풀기 → 카드 뒤집기 (시안 v3, HJ 2026-11-27)
 *
 * - 주인 · 처음: 리본을 누르면 서버 액션이 문장을 골라 저장하고(2번 B) 카드가 뒤집힌다.
 * - 주인 · 이미 열었음: 열린 카드로 시작한다.
 * - 친구(비회원 포함): 주인 카드를 그대로 본다(3번 B). 상자 푸는 재미는 남기되 아무것도 저장하지 않는다.
 *
 * 리본 애니메이션(0.42s)과 서버 응답을 **둘 다** 기다린 뒤 뒤집는다 — 응답이 빨라도 리본이 풀리는 장면은 보이고,
 * 응답이 느리면 리본이 풀린 채 기다린다.
 */
export const CheerScene = ({
  name,
  username,
  isOwner,
  viewerUsername,
  firstLine,
  initialSentence,
}: CheerSceneProps) => {
  const [sentence, setSentence] = useState(initialSentence);
  const [phase, setPhase] = useState<Phase>(
    isOwner && initialSentence ? 'open' : 'closed'
  );
  const cardRef = useRef<HTMLDivElement>(null);

  const cheerPath = `/${username}/cheer`;
  // 친구가 볼 카드가 아직 없다 — 주인이 상자를 열기 전
  const waitingForOwner = !isOwner && !initialSentence;

  const handleOpen = async () => {
    if (phase !== 'closed') return;
    setPhase('untying');
    trackEvent('year_cheer_open', { owner: isOwner });

    const untie = new Promise((resolve) => setTimeout(resolve, UNTIE_MS));

    if (!isOwner) {
      await untie;
      setPhase('open');
      cardRef.current?.focus();
      return;
    }

    const [result] = await Promise.all([openYearCheerAction(), untie]);
    if (!result.ok) {
      toast.error(result.message);
      setPhase('closed');
      return;
    }
    setSentence(result.sentence);
    setPhase('open');
    cardRef.current?.focus();
  };

  const title = isOwner ? (
    <>
      {CHEER_YEAR}년을 보낸
      <br />
      {name}님에게
    </>
  ) : (
    <>
      {CHEER_YEAR}년을 보낸
      <br />
      {name}님에게 온 응원
    </>
  );

  const hint = waitingForOwner
    ? `${name}님이 아직 선물을 열지 않았어요`
    : phase === 'open'
      ? isOwner
        ? '올해의 응원 문장이에요'
        : `${name}님이 받은 올해의 응원이에요`
      : phase === 'untying'
        ? '선물이 열리고 있어요'
        : '리본을 눌러 풀어 보세요';

  const loginNext = encodeURIComponent(cheerPath);

  return (
    <section
      aria-label={`${CHEER_YEAR} 연말 응원 카드`}
      className={cn(
        styles.stage,
        'mx-auto flex w-full max-w-[420px] flex-col gap-5 px-6 pb-9 pt-7 break-keep'
      )}
    >
      <div className='flex items-center justify-between text-[13px] font-semibold text-white/85'>
        <span>{CHEER_YEAR} 연말 선물</span>
        <span className='font-extrabold text-white'>
          page0127<span className={styles.wordmarkDot}>.</span>
        </span>
      </div>

      <div>
        <h1 className='text-[26px] font-extrabold leading-[1.38] tracking-[-0.3px]'>
          {title}
        </h1>
        <p aria-live='polite' className='mt-2 text-sm text-white/90'>
          {hint}
        </p>
      </div>

      {waitingForOwner ? (
        <div className='rounded-2xl bg-white/10 px-5 py-8 text-center text-sm leading-relaxed text-white/90'>
          선물을 열면 이 주소에서 응원 문장을 볼 수 있어요.
        </div>
      ) : (
        <div
          className={cn(
            styles.scene,
            phase !== 'closed' && styles.untied,
            phase === 'open' && styles.opened
          )}
        >
          <div className={styles.flip}>
            {/* 앞: 선물 상자 — 열린 뒤에는 보조기기에서 숨긴다 */}
            <button
              type='button'
              onClick={handleOpen}
              disabled={phase !== 'closed'}
              aria-hidden={phase === 'open'}
              tabIndex={phase === 'open' ? -1 : 0}
              aria-label='선물 열기'
              className={cn(
                styles.face,
                styles.front,
                phase === 'closed' && styles.wiggle,
                'cursor-pointer outline-offset-4 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-default'
              )}
            >
              <span className={styles.ribbonV} />
              <span className={styles.ribbonH} />
              <svg
                className={styles.bow}
                viewBox='0 0 84 56'
                aria-hidden='true'
              >
                <path
                  d='M42 28 C20 0 0 6 6 26 C10 40 30 36 42 28Z M42 28 C64 0 84 6 78 26 C74 40 54 36 42 28Z'
                  fill='#d64554'
                />
                <circle cx='42' cy='28' r='9' fill='#a8303e' />
              </svg>
              <span className='absolute bottom-4 left-4 rounded-lg bg-[#14294e] px-3 py-1.5 text-[13px] font-bold text-white'>
                To. {name}
              </span>
            </button>

            {/* 뒤: 응원 카드 */}
            <div
              ref={cardRef}
              tabIndex={-1}
              aria-hidden={phase !== 'open'}
              className={cn(
                styles.face,
                styles.back,
                'flex flex-col gap-4 px-6 pb-6 pt-6 text-left outline-none'
              )}
            >
              <div>
                <p className='text-xs font-bold tracking-[0.02em] text-[#d64554]'>
                  올해의 응원
                </p>
                <p className='mt-2 text-[15px] leading-relaxed text-[#55627a]'>
                  {firstLine}
                </p>
              </div>
              {sentence && (
                <figure className='mt-2'>
                  <blockquote
                    className={cn(
                      styles.serif,
                      'text-[22px] font-bold leading-[1.65] text-[#1b2333]'
                    )}
                  >
                    {sentence.lines.map((line, i) => (
                      <span key={i} className='block'>
                        {line}
                      </span>
                    ))}
                  </blockquote>
                  <figcaption className='mt-3 text-[13px] text-[#55627a]'>
                    {sentence.author}, 「{sentence.work}」
                  </figcaption>
                </figure>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 버튼 — 열린 뒤에만. 주인은 공유 둘, 친구는 내 서재로 */}
      {phase === 'open' && isOwner && (
        <div className='flex flex-col gap-2'>
          <ShareSheetButton
            imagePath={`${cheerPath}/story-image`}
            fileName={`page0127-cheer-${CHEER_YEAR}.png`}
            title={`${CHEER_YEAR}년을 보낸 나에게 온 응원`}
            sheetTitle='응원 카드 공유하기'
            description='인스타 스토리에 올리기 좋은 세로 카드예요.'
            loadingMessages={CHEER_STORY_LOADING}
            triggerLabel='인스타 스토리로 공유'
            triggerClassName='h-12 w-full rounded-[14px] border-0 bg-[#d64554] text-base font-bold text-white hover:bg-[#c23a49]'
          />
          <ShareButton
            path={cheerPath}
            title={`${name}님이 받은 ${CHEER_YEAR}년 응원`}
            label='친구에게 응원 보내기'
            className='h-12 w-full rounded-[14px] border-0 bg-white text-base font-bold text-[#14294e] hover:bg-white/90'
          />
        </div>
      )}

      {(phase === 'open' || waitingForOwner) && !isOwner && (
        <div className='flex flex-col gap-2'>
          {viewerUsername ? (
            <Link
              href={`/${viewerUsername}/cheer`}
              className='flex h-12 items-center justify-center rounded-[14px] bg-white text-base font-bold text-[#14294e]'
            >
              내 응원 받으러 가기
            </Link>
          ) : (
            <Link
              href={`/login?next=${loginNext}`}
              onClick={() => trackEvent('year_cheer_signup_click', {})}
              className='flex h-12 items-center justify-center rounded-[14px] bg-white text-base font-bold text-[#14294e]'
            >
              나도 서재 만들기
            </Link>
          )}
          <p className='text-center text-[13px] text-white/80'>
            page0127.에서 읽은 책을 기록하면 연말에 응원 선물이 와요
          </p>
        </div>
      )}
    </section>
  );
};
