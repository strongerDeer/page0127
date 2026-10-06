'use client';

import { useRef } from 'react';

import {
  BOOKS_AT,
  pickSpines,
  stepFrame,
  type StepIndex,
} from '../../model/stepFrame';
import { SectionHead } from '../SectionHead';
import { GoalDemo } from './GoalDemo';
import { GrowingShelf } from './GrowingShelf';
import { RecordDemo } from './RecordDemo';
import { useStepPlayer } from './useStepPlayer';

import type { ShelfBook } from '../../model/coverRows';

type StepsShowcaseProps = {
  books: ShelfBook[];
  /** 3단계에 그대로 넣을 실제 취향 카드(서버 컴포넌트) */
  tasteSlot: React.ReactNode;
};

const TABS = [
  {
    label: '기록하기',
    lead: '읽은 책을 기록해요.',
    rest: '책을 검색해 담고, 별점과 한 줄 메모를 남기면 책장에 한 권이 꽂혀요.',
  },
  {
    label: '목표 정하기',
    lead: '올해 목표를 정해요.',
    rest: '몇 권 읽을지 정하면 진행률과 달마다의 기록이 차곡차곡 쌓여요.',
  },
  {
    label: '취향 분석',
    lead: '취향 분석을 받아요.',
    rest: '평가한 완독 책이 다섯 권 모이면, AI가 독서 취향을 노트로 써 드려요.',
  },
] as const;

/** 좌우 화살표·Home·End 로 갈 단계 (ARIA 탭 패턴) */
const KEY_TARGET: Record<string, (step: StepIndex) => StepIndex> = {
  ArrowRight: (s) => ((s + 1) % 3) as StepIndex,
  ArrowLeft: (s) => ((s + 2) % 3) as StepIndex,
  Home: () => 0,
  End: () => 2,
};

/**
 * 이용 방법 세 걸음 — 탭(위) → 브라우저 창 패널 → 설명.
 * 같은 책장이 1 → 7 → 12권으로 자라는 하나의 이야기로 보여 준다.
 */
export const StepsShowcase = ({ books, tasteSlot }: StepsShowcaseProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const playRef = useRef<HTMLButtonElement>(null);
  const { step, local, playing, choose, togglePlay, setHold } =
    useStepPlayer(panelRef);
  const frame = stepFrame(step, local);
  const spines = pickSpines(books, BOOKS_AT[2]);
  const recordBook = books.find((b) => b.coverImage);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = KEY_TARGET[e.key];
    if (!target) return;
    e.preventDefault();
    const next = target(step);
    choose(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section
      id='steps'
      aria-labelledby='steps-title'
      className='scroll-mt-16 bg-sunken px-4 py-32'
      // React 의 onFocus/onBlur 는 버블링된다 — 영역 안 어디에 포커스가 있든 잡힌다.
      // 키보드로 옮긴 포커스(:focus-visible)일 때만 잠시 멈춘다. 마우스 클릭도 포커스를
      // 옮기므로, 그대로 두면 재생 버튼을 누르는 순간 멈춰 '빈 화면 + 일시정지 아이콘'이
      // 된다. 재생 버튼 자체에 간 포커스도 멈춤 사유가 아니다 — 재생하려고 누른 것이다.
      onFocus={(e) =>
        setHold(
          e.target !== playRef.current && e.target.matches(':focus-visible')
        )
      }
      onBlur={() => setHold(false)}
    >
      <SectionHead
        id='steps-title'
        label='이용 방법'
        title={
          <>
            책장 하나가 자라는
            <br />
            <span className='text-primary'>세 걸음.</span>
          </>
        }
      />

      <div className='mt-10 flex flex-wrap items-center justify-center gap-2.5'>
        <div
          role='tablist'
          aria-label='이용 방법 단계'
          onKeyDown={onKeyDown}
          className='inline-flex gap-1 rounded-full bg-card p-1.5 shadow-sm ring-1 ring-line'
        >
          {TABS.map((t, i) => {
            const selected = step === i;
            return (
              <button
                key={t.label}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type='button'
                role='tab'
                id={`step-tab-${i}`}
                aria-selected={selected}
                aria-controls='step-panel'
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(i as StepIndex)}
                className={`relative overflow-hidden rounded-full px-4 py-2.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:px-5 ${
                  selected ? 'text-primary' : 'text-text-subtle'
                }`}
              >
                {/* 자동 재생 중에는 진행 막대, 멈춘 뒤에는 선택된 탭만 채운다 —
                    멈춘 상태에서 지난 탭까지 채우면 셋 다 선택된 것처럼 보인다 */}
                <span
                  aria-hidden='true'
                  className='absolute inset-y-0 left-0 bg-accent'
                  style={{
                    width: `${
                      playing
                        ? i < step
                          ? 100
                          : selected
                            ? local * 100
                            : 0
                        : selected
                          ? 100
                          : 0
                    }%`,
                  }}
                />
                <span className='relative'>
                  {i + 1}. {t.label}
                </span>
              </button>
            );
          })}
        </div>
        <button
          ref={playRef}
          type='button'
          onClick={togglePlay}
          aria-label={playing ? '자동 재생 일시정지' : '자동 재생 시작'}
          className='grid size-11 place-items-center rounded-full bg-card text-text-strong shadow-sm ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        >
          <span aria-hidden='true'>{playing ? '❚❚' : '▶'}</span>
        </button>
      </div>

      <div
        ref={panelRef}
        role='tabpanel'
        id='step-panel'
        aria-labelledby={`step-tab-${step}`}
        className='mx-auto mt-6 max-w-4xl'
      >
        <div className='rounded-3xl bg-card p-4 ring-1 ring-line md:p-12'>
          <div className='overflow-hidden rounded-2xl border border-line bg-card shadow-xl'>
            <div
              aria-hidden='true'
              className='flex h-10 items-center gap-1.5 border-b border-line bg-sunken px-3.5'
            >
              <i className='size-2.5 rounded-full bg-line' />
              <i className='size-2.5 rounded-full bg-line' />
              <i className='size-2.5 rounded-full bg-line' />
              <span className='ml-3 rounded-md bg-card px-2.5 py-1 text-xs text-text-subtle'>
                page0127.com/hyejin
              </span>
            </div>
            <div className='p-4 md:p-6'>
              <div className='flex items-center gap-2.5'>
                <span className='grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-primary'>
                  혜
                </span>
                <b className='text-sm text-text-strong'>혜진님의 서재</b>
                <span className='ml-auto rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary'>
                  {frame.books}권
                </span>
              </div>
              <GrowingShelf spines={spines} count={frame.books} />
              <div className='mt-4 min-h-56'>
                {step === 0 && (
                  <RecordDemo
                    stars={frame.stars}
                    memoRatio={frame.memoRatio}
                    cover={recordBook?.coverImage ?? null}
                    title={recordBook?.title ?? '첫 번째 책'}
                  />
                )}
                {step === 1 && <GoalDemo goalRatio={frame.goalRatio} />}
                {step === 2 && tasteSlot}
              </div>
            </div>
          </div>
        </div>
        <p className='mx-auto mt-7 max-w-xl text-balance text-center text-base text-text-subtle'>
          <b className='font-bold text-text-strong'>{TABS[step].lead}</b>{' '}
          {TABS[step].rest}
        </p>
      </div>
    </section>
  );
};
