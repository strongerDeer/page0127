'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, CoverImage } from '@repo/ui';
import { ArrowRight, Check, RotateCcw, RotateCw } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

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
import { GoalStarter } from './GoalStarter';
import { PreviewShelf } from './PreviewShelf';
import { ShelfSearch } from './ShelfSearch';

import type { ShelfPick } from '../model/types';

type ShelfPreviewProps = { picks: ShelfPick[] };

/**
 * 비로그인 홈의 히어로 — 서비스 문장 · 내 책장 · 고르기를 한 화면에.
 *
 * 학습 포인트:
 * - 가입을 "부탁"하지 않는다. 이미 만든 책장을 "저장"하려고 가입하게 한다.
 *   그래서 저장 버튼은 한 권이라도 고른 뒤에야 나타난다.
 * - 배치는 grid-template-areas 하나로 두 모양을 만든다.
 *   모바일: 문장 → 고르기 → 책장 / 데스크톱: 왼쪽(문장·책장) · 오른쪽(고르기)
 */
export const ShelfPreview = ({ picks }: ShelfPreviewProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfPick[]>([]);
  const [page, setPage] = useState(0);

  const pages = toPickPages(picks);
  const current = pages[page] ?? [];
  const isFull = selected.length >= MAX_PENDING_BOOKS;
  const message = toShelfPreviewMessage(selected.length);
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

  const handleSave = () => {
    trackEvent('shelf_preview_save', { count: selected.length });
    writePendingShelf({ books: selected.map((p) => p.book), goal: null });
    router.push('/login');
  };

  return (
    <section
      aria-labelledby='shelf-preview-title'
      className='tint-cool grid gap-x-16 gap-y-10 rounded-3xl px-5 py-8 [grid-template-areas:"intro"_"picks"_"shelf"] md:p-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:[grid-template-areas:"intro_picks"_"shelf_picks"]'
    >
      <div className='[grid-area:intro]'>
        <h1
          id='shelf-preview-title'
          className='break-keep text-3xl font-extrabold leading-tight tracking-tight text-text-strong md:text-5xl'
        >
          책장을 보면,
          <br />그 사람이 보인다.
        </h1>
        <p className='mt-4 break-keep text-base leading-relaxed text-text-body md:text-lg'>
          읽은 책을 골라 책장을 채워주세요.
          <br />
          당신의 취향은 어떤가요?
        </p>
      </div>

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

      <div className='flex flex-col [grid-area:shelf]'>
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
        <div className='mt-5 lg:min-h-36'>
          {selected.length > 0 && (
            <>
              <p
                aria-live='polite'
                className='break-keep font-bold text-text-strong md:text-lg'
              >
                {message}
              </p>
              {isFull && (
                <p className='mt-1 text-xs text-text-subtle'>
                  한 번에 {MAX_PENDING_BOOKS}권까지 꽂을 수 있어요.
                </p>
              )}
              <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'>
                <Button
                  size='lg'
                  onClick={handleSave}
                  className='h-14 w-full gap-2 px-7 text-base font-bold shadow-lg shadow-primary/30 sm:w-auto'
                >
                  지금 책 저장하기
                  <ArrowRight aria-hidden='true' className='size-5' />
                </Button>
                <span className='text-xs text-text-subtle'>
                  무료 · 구글·카카오로 10초 가입
                </span>
              </div>
            </>
          )}
        </div>

        <div className='mt-auto pt-2'>
          <GoalStarter />
        </div>
      </div>
    </section>
  );
};
