'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, CoverImage } from '@repo/ui';
import { ArrowRight, Check, RotateCcw, RotateCw } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { toFirstImpression } from '@/entities/taste-analysis/model/firstImpression';

import { toPendingLoginPath } from '../model/loginTransfer';
import {
  clearPendingShelf,
  MAX_PENDING_BOOKS,
  readPendingShelf,
  writePendingShelf,
} from '../model/pendingShelf';
import { toPickPages } from '../model/pickPages';
import { toShelfPreviewMessage } from '../model/previewMessage';
import { restoreSelection } from '../model/restoreSelection';
import { isSameBook, toggleSelection } from '../model/selection';
import { FirstImpressionCard } from './FirstImpressionCard';
import { GoalStarter } from './GoalStarter';
import { PreviewShelf } from './PreviewShelf';
import { ShelfBar } from './ShelfBar';
import { ShelfSearch } from './ShelfSearch';

import type { ShelfPick } from '../model/types';

type ShelfPreviewProps = { picks: ShelfPick[] };

/**
 * 홈의 책장 맛보기("당신의 첫인상.") — 내 책장 · 고르기를 한 섹션에.
 *
 * 학습 포인트:
 * - 가입을 "부탁"하지 않는다. 이미 만든 책장을 "저장"하려고 가입하게 한다.
 *   그래서 저장 버튼은 한 권이라도 고른 뒤에야 나타난다.
 * - 배치는 grid-template-areas 하나로 두 모양을 만든다.
 *   모바일: 고르기 → 책장 / 데스크톱: 왼쪽(책장) · 오른쪽(고르기)
 */
export const ShelfPreview = ({ picks }: ShelfPreviewProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfPick[]>([]);
  const [page, setPage] = useState(0);

  const pages = toPickPages(picks);
  const current = pages[page] ?? [];
  const isFull = selected.length >= MAX_PENDING_BOOKS;
  const message = toShelfPreviewMessage(selected.length);
  const impression = toFirstImpression(selected.map((p) => p.book.category));
  const isSelected = (pick: ShelfPick) =>
    selected.some((p) => isSameBook(p.book, pick.book));

  // 다시 온 방문자: 고르고 로그인하지 않은 채 떠났다면 그 책장을 되살린다.
  // 저장소는 브라우저에만 있어 서버 렌더 때는 읽을 수 없다 → 마운트 후 한 번.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const pending = readPendingShelf();
    if (!pending || pending.books.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 후에만 읽힌다
    setSelected(
      restoreSelection(
        pending.books,
        picks,
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      )
    );
  }, [picks]);

  // 비울 땐 보관분도 지운다 — 남겨 두면 다시 왔을 때 비웠던 책장이 되살아난다
  const handleReset = () => {
    setSelected([]);
    clearPendingShelf();
  };

  const handleToggle = (
    pick: ShelfPick,
    source: 'picks' | 'search' | 'shelf'
  ) => {
    const next = toggleSelection(selected, pick, MAX_PENDING_BOOKS);
    // 해제는 세지 않는다 — "고르는 행동"이 일어났는지만 본다
    if (next.length > selected.length) {
      trackEvent('shelf_preview_pick', { source, count: next.length });
    }
    setSelected(next);
  };

  // 첫인상·저장 버튼 영역이 아직 화면 아래에 있는가 — 모바일 하단 바를 띄울지 정한다.
  // 위로 지나간 경우(이미 본 것)는 띄우지 않는다. 60% 이상 보여야 '본 것'으로 친다.
  const nextStepRef = useRef<HTMLDivElement>(null);
  const [nextStepBelow, setNextStepBelow] = useState(false);
  useEffect(() => {
    const el = nextStepRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setNextStepBelow(
          entry.intersectionRatio < 0.6 && entry.boundingClientRect.top > 0
        ),
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleJump = () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    nextStepRef.current?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'center',
    });
  };

  // source — 하단 바가 저장을 얼마나 끌어오는지 따로 본다
  const handleSave = (source: 'shelf' | 'bar') => {
    trackEvent('shelf_preview_save', { count: selected.length, source });
    const pending = { books: selected.map((p) => p.book), goal: null };
    writePendingShelf(pending);
    router.push(toPendingLoginPath(pending));
  };

  return (
    // id: 홈 첫 화면의 "내 책장 만들어 보기"가 여기로 내려온다(scroll-mt 로 GNB 에 안 가리게)
    <section
      id='first-impression'
      aria-labelledby='shelf-preview-title'
      className='page-width scroll-mt-20 py-20 md:py-28'
    >
      {/* 머리는 소개 페이지 SectionHead 와 같은 문법(파란 라벨 → 큰 제목 → 회색 설명).
          features 는 widgets 를 가져올 수 없어 모양만 맞춘다.
          홈의 h1 은 첫 화면("읽은 책을 꽂아 두면…")이 맡아 여기는 h2 다(2026-10-25 홈 개편) */}
      <div className='text-center'>
        <p className='text-sm font-bold text-primary'>1분 맛보기</p>
        <h2 id='shelf-preview-title' className='display-xl mt-2 text-balance'>
          당신의 첫인상.
        </h2>
        {/* 할 일(지시)이 아니라 약속 — 노력(세 권)과 보상(취향)을 한 번에 말한다 */}
        <p className='mx-auto mt-4 max-w-xl text-balance text-base text-text-subtle md:text-lg'>
          기억나는 책 세 권을 골라보세요.
          <br />
          당신의 취향을 알려드릴게요!
        </p>
      </div>

      {/* 모바일: 고르기 → 책장 / 데스크톱: 왼쪽(책장·첫인상·저장) · 오른쪽(고르기) */}
      <div className='mt-12 grid gap-x-16 gap-y-10 [grid-template-areas:"picks"_"shelf"] md:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:[grid-template-areas:"shelf_picks"]'>
        <div className='[grid-area:picks]'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-sm font-bold text-text-strong md:text-base'>
              이 중에 읽은 책이 있나요?
            </h2>
            {pages.length > 1 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => (p + 1) % pages.length)}
                className='gap-1.5 rounded-full'
              >
                <RotateCw aria-hidden='true' className='size-3.5' />
                다른 책 보기
                <span className='font-normal text-text-subtle'>
                  {page + 1}/{pages.length}
                </span>
              </Button>
            )}
          </div>

          {current.length > 0 && (
            <ul className='mt-4 grid grid-cols-4 gap-3 md:mt-5 md:gap-5'>
              {current.map((pick) => {
                const on = isSelected(pick);
                return (
                  <li key={pick.book.isbn}>
                    <button
                      type='button'
                      aria-pressed={on}
                      aria-label={pick.book.title}
                      disabled={!on && isFull}
                      onClick={() => handleToggle(pick, 'picks')}
                      className={`relative block w-full rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 motion-reduce:transition-none ${
                        on
                          ? '-translate-y-1 shadow-lg ring-3 ring-primary'
                          : 'shadow-md ring-1 ring-text-strong/10 hover:-translate-y-1'
                      }`}
                    >
                      <CoverImage
                        src={pick.coverSrc}
                        fallbackSrc={pick.coverFallback}
                        alt=''
                        width={120}
                        height={180}
                        fallback={
                          <span className='flex aspect-2/3 items-center justify-center rounded-md bg-sunken p-1 text-[10px] text-text-subtle'>
                            {pick.book.title}
                          </span>
                        }
                        className='aspect-2/3 h-auto w-full rounded-md object-cover'
                      />
                      {on && (
                        <span className='absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow md:size-7'>
                          <Check aria-hidden='true' className='size-3.5' />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <ShelfSearch
            isSelected={isSelected}
            disabled={isFull}
            onPick={(pick) => handleToggle(pick, 'search')}
          />
        </div>

        {/* 책장·다음 행동을 옅은 파란 판 하나로 묶는다 — 흰 바탕에 떠 있던 요소들이 흩어져 허전해 보였다(2026-10-25 HJ) */}
        <div className='tint-blue flex flex-col self-start rounded-3xl p-5 md:p-7 [grid-area:shelf]'>
          <div className='flex min-h-8 items-center justify-between gap-3'>
            <p className='text-xs font-bold text-text-subtle md:text-sm'>
              내 책장 · {selected.length}권
            </p>
            {selected.length > 0 && (
              <button
                type='button'
                onClick={handleReset}
                className='flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-text-subtle hover:bg-primary/10 hover:text-text-strong md:text-sm'
              >
                <RotateCcw aria-hidden='true' className='size-3.5' />
                모두 비우기
              </button>
            )}
          </div>
          <div className='mt-2'>
            <PreviewShelf
              picks={selected}
              onRemove={(pick) => handleToggle(pick, 'shelf')}
            />
          </div>
          {selected.length > 0 && (
            <p className='mt-2 text-xs text-text-subtle'>
              꽂힌 책을 누르면 뺄 수 있어요.
            </p>
          )}

          {/* 데스크톱에선 버튼이 나타날 자리를 미리 비워 둔다 — 고르는 순간 왼쪽 열이 늘면
            가운데 정렬된 오른쪽 그리드까지 흔들린다. 모바일은 그리드가 위에 있어 밀릴 것이 없다 */}
          <div ref={nextStepRef} className='mt-5 lg:min-h-36'>
            {/* 0권이면 같은 자리에 목표 링크를 둔다. 예전엔 맨 아래(mt-auto)에 붙어
              데스크톱에서 빈 책장과 링크 사이가 크게 비었고, 책을 고른 뒤에도
              "아직 읽은 책이 없나요?"가 남아 있었다(2026-10-24 운영 점검) */}
            {selected.length === 0 && <GoalStarter />}
            {selected.length > 0 && (
              <>
                {/* 저장 버튼을 맨 위에 고정한다 — 아래 첫인상 카드·남은 권수 문구는 고른 권수에 따라
                  나타났다 사라지는데, 버튼이 그 아래에 있으면 책을 고를 때마다 위아래로 움직였다(2026-10-25 HJ) */}
                <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
                  <Button
                    size='lg'
                    onClick={() => handleSave('shelf')}
                    className='h-14 w-full gap-2 px-7 text-base font-bold shadow-lg shadow-primary/30 sm:w-auto'
                  >
                    지금 책 저장하기
                    <ArrowRight aria-hidden='true' className='size-5' />
                  </Button>
                  <span className='text-xs text-text-subtle'>
                    무료 · 구글·카카오로 10초 가입
                  </span>
                </div>
                {/* 상한 안내도 같은 알림 영역 안에 둔다 — 버튼이 막힌 이유를
                  스크린리더 사용자도 들어야 한다 */}
                <div aria-live='polite' className='mt-5 space-y-3'>
                  {message && (
                    <p className='break-keep font-bold text-text-strong md:text-lg'>
                      {message}
                    </p>
                  )}
                  {impression && <FirstImpressionCard type={impression} />}
                  {isFull && (
                    <p className='mt-1 text-xs text-text-subtle'>
                      한 번에 {MAX_PENDING_BOOKS}권까지 꽂을 수 있어요.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 모바일 전용 — 데스크톱은 책장·저장 버튼이 첫 화면에 함께 보인다.
          contents: 감싼 상자가 그리드 칸을 차지하지 않게(바는 fixed 라 칸 밖이다) */}
      <div className='contents lg:hidden'>
        <ShelfBar
          count={selected.length}
          impression={impression}
          visible={selected.length > 0 && nextStepBelow}
          onJump={handleJump}
          onSave={() => handleSave('bar')}
        />
      </div>
    </section>
  );
};
