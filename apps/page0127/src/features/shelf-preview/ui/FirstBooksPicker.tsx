'use client';

import { useEffect, useState } from 'react';

import { Button, CoverImage } from '@repo/ui';
import { ArrowRight, Check, RotateCw } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { markLoginStart } from '@/shared/lib/auth/loginStart';

import { toFirstImpression } from '@/entities/taste-analysis/model/firstImpression';

import {
  MAX_PENDING_BOOKS,
  readPendingShelf,
  writePendingShelf,
} from '../model/pendingShelf';
import { toPickPages } from '../model/pickPages';
import { isSameBook, toggleSelection } from '../model/selection';
import { FirstImpressionCard } from './FirstImpressionCard';
import { PreviewShelf } from './PreviewShelf';
import { ShelfSearch } from './ShelfSearch';

import type { ShelfPick } from '../model/types';

type FirstBooksPickerProps = {
  picks: ShelfPick[];
  /** 고르거나 건너뛴 뒤 갈 곳(내 서재) */
  target: string;
};

/** 이만큼 고르면 첫인상이 나온다 — 홈 맛보기와 같은 약속 */
const SUGGESTED_COUNT = 3;

/**
 * 가입 직후 "읽은 책 고르기" — 빈 서재에 도착하기 전에 한 번 거친다.
 *
 * 왜: 2026-10-30~11-01 가입자 대부분이 빈 서재에 도착한 뒤 도서 추가를 한 번도
 * 열지 않았다. 가입을 막 끝낸 사람에게 "검색해서 한 권 넣기"는 또 하나의 숙제다.
 * 홈 맛보기처럼 표지를 누르기만 하면 되게 한다.
 *
 * 담기는 새로 만들지 않는다: 고른 책을 맛보기 보관분에 쓰고 서재로 보내면,
 * 서재의 PendingShelfClaimer 가 담고 완독 연도·별점까지 묻는다(맛보기와 같은 길).
 * markLoginStart 로 "방금 이 탭에서 이어진 흐름"이라 표시해 다시 묻지 않게 한다.
 */
export const FirstBooksPicker = ({ picks, target }: FirstBooksPickerProps) => {
  const [selected, setSelected] = useState<ShelfPick[]>([]);
  const [page, setPage] = useState(0);
  const [leaving, setLeaving] = useState(false);
  // 홈 맛보기에서 이미 고르고 온 사람인지 확인하기 전까지는 그리지 않는다
  const [checked, setChecked] = useState(false);

  // 맛보기에서 고른 책을 들고 왔다면 서재가 그 책을 담는다 — 여기서 또 묻지 않는다
  useEffect(() => {
    const pending = readPendingShelf();
    if (pending && (pending.books.length > 0 || pending.goal)) {
      window.location.replace(target);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 후에만 읽힌다
    setChecked(true);
  }, [target]);

  const pages = toPickPages(picks);
  const current = pages[page] ?? [];
  const isFull = selected.length >= MAX_PENDING_BOOKS;
  const impression = toFirstImpression(selected.map((p) => p.book.category));
  const remaining = SUGGESTED_COUNT - selected.length;
  const isSelected = (pick: ShelfPick) =>
    selected.some((p) => isSameBook(p.book, pick.book));

  const handleToggle = (pick: ShelfPick) =>
    setSelected((prev) => toggleSelection(prev, pick, MAX_PENDING_BOOKS));

  const handleSave = () => {
    setLeaving(true);
    trackEvent('first_books_save', { count: selected.length });
    writePendingShelf({ books: selected.map((p) => p.book), goal: null });
    markLoginStart();
    // 전체 이동 — 서재 레이아웃이 새로 떠야 담기(PendingShelfClaimer)가 돈다
    window.location.assign(target);
  };

  const handleSkip = () => {
    setLeaving(true);
    trackEvent('first_books_skip');
    window.location.assign(target);
  };

  if (!checked) return null;

  return (
    <div className='space-y-8'>
      <div>
        <p className='text-sm font-bold text-primary'>가입 완료</p>
        <h1 className='heading-1 mt-2 text-balance'>
          기억나는 책을 골라 주세요
        </h1>
        <p className='mt-2 text-text-subtle break-keep'>
          읽은 책을 누르면 바로 서재에 꽂혀요. 세 권이면 책장의 첫인상이 나와요.
        </p>
      </div>

      <div>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-bold text-text-strong'>
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
          <ul className='mt-4 grid grid-cols-4 gap-3'>
            {current.map((pick) => {
              const on = isSelected(pick);
              return (
                <li key={pick.book.isbn}>
                  <button
                    type='button'
                    aria-pressed={on}
                    aria-label={pick.book.title}
                    disabled={!on && isFull}
                    onClick={() => handleToggle(pick)}
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
                      <span className='absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow'>
                        <Check aria-hidden='true' className='size-3.5' />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* 목록에 없으면 검색 — 이 화면의 목적은 "내가 읽은 책"이라 열어 두지 않고 접어 둔다 */}
        <ShelfSearch
          isSelected={isSelected}
          disabled={isFull}
          onPick={handleToggle}
        />
      </div>

      <div className='tint-blue space-y-4 rounded-3xl p-5'>
        <p className='text-xs font-bold text-text-subtle'>
          내 책장 · {selected.length}권
        </p>
        <PreviewShelf picks={selected} onRemove={handleToggle} />
        <div aria-live='polite' className='space-y-3'>
          {remaining > 0 && selected.length > 0 && (
            <p className='text-sm font-bold text-text-strong'>
              {remaining}권만 더 고르면 첫인상이 나와요
            </p>
          )}
          {impression && <FirstImpressionCard type={impression} />}
        </div>
      </div>

      <div className='flex flex-col gap-2 sm:flex-row-reverse sm:items-center sm:justify-between'>
        <Button
          size='lg'
          disabled={selected.length === 0 || leaving}
          onClick={handleSave}
          className='h-14 w-full gap-2 text-base font-bold sm:w-auto sm:px-8'
        >
          {selected.length === 0
            ? '책을 골라 주세요'
            : `${selected.length}권 꽂고 내 서재로`}
          <ArrowRight aria-hidden='true' className='size-5' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          disabled={leaving}
          onClick={handleSkip}
          className='text-text-subtle'
        >
          나중에 할게요
        </Button>
      </div>
    </div>
  );
};
