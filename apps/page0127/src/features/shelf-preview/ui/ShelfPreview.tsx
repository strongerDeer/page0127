'use client';

import { createContext, use, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, CoverImage } from '@repo/ui';
import { ArrowRight, Check, RotateCcw, RotateCw } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { PenNote } from '@/shared/ui/PenNote';

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
import { ShelfSearch } from './ShelfSearch';

import type { ShelfPick } from '../model/types';

/** 첫인상을 알려 주는 권수 — 쪽 글("세 권을 골라보세요")과 같다 */
const IMPRESSION_AT = 3;

type Source = 'picks' | 'search' | 'shelf';

type ShelfPreviewState = {
  picks: ShelfPick[];
  selected: ShelfPick[];
  isSelected: (pick: ShelfPick) => boolean;
  isFull: boolean;
  toggle: (pick: ShelfPick, source: Source) => void;
  reset: () => void;
  save: () => void;
};

const ShelfPreviewContext = createContext<ShelfPreviewState | null>(null);

const useShelfPreview = () => {
  const state = use(ShelfPreviewContext);
  if (!state) throw new Error('ShelfPreviewProvider 안에서만 쓸 수 있어요');
  return state;
};

type ShelfPreviewProviderProps = {
  picks: ShelfPick[];
  children: React.ReactNode;
};

/**
 * 홈의 책장 맛보기("당신의 첫인상.") — 고른 책 상태를 두 쪽이 함께 본다.
 *
 * 홈은 한 권의 책이라 맛보기도 시안처럼 두 쪽으로 나눴다(2026-11-17 HJ "한 쪽에 하나씩"):
 *   2장 책 고르기(ShelfPickCount · ShelfPickGrid) → 3장 내 책장(ShelfSaveAction · ShelfPanel)
 * 쪽 틀(home-book Chapter)은 서버 컴포넌트라, 상태는 두 쪽을 감싸는 이 Provider 가 들고
 * 쪽 안의 조각들이 Context 로 읽는다(Provider 는 DOM 을 만들지 않아 쪽 배치를 건드리지 않는다).
 *
 * 학습 포인트:
 * - 가입을 "부탁"하지 않는다. 이미 만든 책장을 "저장"하려고 가입하게 한다.
 *   그래서 저장 버튼은 한 권이라도 고른 뒤에야 나타난다.
 */
export const ShelfPreviewProvider = ({
  picks,
  children,
}: ShelfPreviewProviderProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfPick[]>([]);

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

  const state: ShelfPreviewState = {
    picks,
    selected,
    isSelected: (pick) => selected.some((p) => isSameBook(p.book, pick.book)),
    isFull: selected.length >= MAX_PENDING_BOOKS,
    toggle: (pick, source) => {
      const next = toggleSelection(selected, pick, MAX_PENDING_BOOKS);
      // 해제는 세지 않는다 — "고르는 행동"이 일어났는지만 본다
      if (next.length > selected.length) {
        trackEvent('shelf_preview_pick', { source, count: next.length });
      }
      setSelected(next);
    },
    // 비울 땐 보관분도 지운다 — 남겨 두면 다시 왔을 때 비웠던 책장이 되살아난다
    reset: () => {
      setSelected([]);
      clearPendingShelf();
    },
    save: () => {
      trackEvent('shelf_preview_save', {
        count: selected.length,
        source: 'shelf',
      });
      const pending = { books: selected.map((p) => p.book), goal: null };
      writePendingShelf(pending);
      router.push(toPendingLoginPath(pending));
    },
  };

  return <ShelfPreviewContext value={state}>{children}</ShelfPreviewContext>;
};

/** 2장 글 쪽 — 몇 권 골랐는지. 다 고르면 다음 쪽(내 책장)으로 가는 길을 연다 */
export const ShelfPickCount = ({ shelfHref }: { shelfHref: string }) => {
  const { selected } = useShelfPreview();
  const n = selected.length;
  return (
    <div aria-live='polite' className='flex flex-col items-start gap-3'>
      <p className='text-sm text-text-subtle md:text-base'>
        <b className='text-2xl font-bold text-primary md:text-3xl'>{n}</b>{' '}
        {n < IMPRESSION_AT ? `/ ${IMPRESSION_AT}권 골랐어요` : '권 골랐어요'}
      </p>
      {n === 0 && (
        <PenNote className='mt-1'>기억나는 걸로 딱 세 권만 →</PenNote>
      )}
      {n > 0 && (
        <Button asChild variant='secondary' className='gap-1.5 rounded-full'>
          <a href={shelfHref}>
            내 책장 보기
            <ArrowRight aria-hidden='true' className='size-4' />
          </a>
        </Button>
      )}
    </div>
  );
};

/** 2장 그림 쪽 — 표지 여덟 권 묶음 + 다른 책 보기 + 직접 찾기 */
export const ShelfPickGrid = () => {
  const { picks, isSelected, isFull, toggle } = useShelfPreview();
  const [page, setPage] = useState(0);
  const pages = toPickPages(picks);
  const current = pages[page] ?? [];

  return (
    <div className='w-full max-w-xl'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-sm font-bold text-text-strong md:text-base'>
          이 중에 읽은 책이 있나요?
        </h3>
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
        // 쪽 하나에 다 들어가게 표지 폭을 화면 높이에 맞춰 줄인다(작은 노트북·폰)
        <ul className='mt-3 grid grid-cols-4 gap-3 md:mt-4 md:gap-4 [@media(max-height:760px)]:mx-auto [@media(max-height:760px)]:max-w-[22rem]'>
          {current.map((pick) => {
            const on = isSelected(pick);
            return (
              <li key={pick.book.isbn}>
                <button
                  type='button'
                  aria-pressed={on}
                  aria-label={pick.book.title}
                  disabled={!on && isFull}
                  onClick={() => toggle(pick, 'picks')}
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
        onPick={(pick) => toggle(pick, 'search')}
      />
    </div>
  );
};

/** 3장 글 쪽 — 고른 뒤에만 나타나는 저장 버튼 */
export const ShelfSaveAction = () => {
  const { selected, save } = useShelfPreview();
  if (selected.length === 0) return null;
  return (
    <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
      <Button
        size='lg'
        onClick={save}
        className='h-14 gap-2 px-7 text-base font-bold shadow-lg shadow-primary/30'
      >
        지금 책 저장하기
        <ArrowRight aria-hidden='true' className='size-5' />
      </Button>
      <span className='text-xs text-text-subtle'>
        무료 · 구글·카카오로 10초 가입
      </span>
    </div>
  );
};

/** 3장 그림 쪽 — 내 책장 판: 꽂힌 책 · 남은 권수 · 첫인상. 0권이면 목표 세우기 */
export const ShelfPanel = () => {
  const { selected, isFull, toggle, reset } = useShelfPreview();
  const message = toShelfPreviewMessage(selected.length);
  const impression = toFirstImpression(selected.map((p) => p.book.category));

  return (
    // 책장·다음 행동을 옅은 파란 판 하나로 묶는다(2026-10-25 HJ).
    // 시안 아날로그 룩(2026-11-17): 종이 카드처럼 모서리를 덜 둥글게 + 위에 마스킹 테이프 + 연필 메모
    <div className='tint-blue relative flex w-full max-w-xl flex-col rounded-md p-5 shadow-[0_1px_0_var(--line),0_22px_36px_-24px_rgb(16_40_80/0.4)] md:p-7'>
      <span
        aria-hidden='true'
        className='absolute -top-3 left-1/2 h-6 w-26 -translate-x-1/2 -rotate-3 bg-[rgb(120_150_195/0.38)] shadow-[0_1px_2px_rgb(0_0_0/0.08)] [clip-path:polygon(2%_0,98%_0,100%_22%,97%_44%,100%_66%,97%_86%,99%_100%,1%_100%,3%_82%,0_62%,3%_42%,0_20%)]'
      />
      {/* 넓은 화면은 판 위 바깥에 띄우고, 좁은 화면은 위 설명 글을 덮어서 판 안 오른쪽 위에 둔다(2026-11-18 점검) */}
      <PenNote className='-mt-1 mb-1 self-end md:absolute md:-top-11 md:right-0 md:m-0'>
        여기 꽂혀요 ↓
      </PenNote>
      <div className='flex min-h-8 items-center justify-between gap-3'>
        <p className='text-xs font-bold text-text-subtle md:text-sm'>
          내 책장 · {selected.length}권
        </p>
        {selected.length > 0 && (
          <button
            type='button'
            onClick={reset}
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
          onRemove={(pick) => toggle(pick, 'shelf')}
        />
      </div>
      {selected.length > 0 && (
        <p className='mt-2 text-xs text-text-subtle'>
          꽂힌 책을 누르면 뺄 수 있어요.
        </p>
      )}

      <div className='mt-4'>
        {selected.length === 0 ? (
          <GoalStarter />
        ) : (
          // 상한 안내도 같은 알림 영역 안에 둔다 — 버튼이 막힌 이유를 스크린리더 사용자도 들어야 한다
          <div aria-live='polite' className='space-y-3'>
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
        )}
      </div>
    </div>
  );
};
