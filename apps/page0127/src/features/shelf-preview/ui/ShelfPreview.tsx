'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, CoverImage } from '@repo/ui';
import { Check } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { MAX_PENDING_BOOKS, writePendingShelf } from '../model/pendingShelf';
import { toShelfPreviewMessage } from '../model/previewMessage';
import { isSameBook, toggleSelection } from '../model/selection';
import { GoalStarter } from './GoalStarter';
import { PreviewShelf } from './PreviewShelf';
import { ShelfSearch } from './ShelfSearch';

import type { ShelfPick } from '../model/types';

type ShelfPreviewProps = { picks: ShelfPick[] };

/**
 * 홈 '책장 맛보기' — 고르면 내 책장이 그려지고, 저장은 로그인으로 이어진다.
 *
 * 학습 포인트:
 * - 가입을 "부탁"하지 않는다. 이미 만든 책장을 "저장"하려고 가입하게 한다.
 * - 보관에 실패해도(비공개 모드 등) 로그인은 진행한다 — 빈 서재로 시작할 뿐이다.
 */
export const ShelfPreview = ({ picks }: ShelfPreviewProps) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ShelfPick[]>([]);

  const isFull = selected.length >= MAX_PENDING_BOOKS;
  const message = toShelfPreviewMessage(selected.length);
  const isSelected = (pick: ShelfPick) =>
    selected.some((p) => isSameBook(p.book, pick.book));

  const handleToggle = (pick: ShelfPick, source: 'picks' | 'search') => {
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
      className='rounded-2xl border border-line-soft p-6 md:p-10'
    >
      <h2
        id='shelf-preview-title'
        className='heading-2 break-keep text-text-strong'
      >
        읽은 책을 골라 보세요.
      </h2>
      <p className='mt-2 break-keep text-sm text-text-subtle'>
        고른 책이 내 책장에 꽂혀요. 한 권도 없어도 괜찮아요.
      </p>

      {picks.length > 0 && (
        <ul className='mt-6 grid grid-cols-5 gap-2 md:grid-cols-10 md:gap-3'>
          {picks.map((pick) => {
            const on = isSelected(pick);
            return (
              <li key={pick.book.isbn}>
                <button
                  type='button'
                  aria-pressed={on}
                  aria-label={pick.book.title}
                  disabled={!on && isFull}
                  onClick={() => handleToggle(pick, 'picks')}
                  className={`relative block w-full overflow-hidden rounded-md transition focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40 ${
                    on ? 'ring-2 ring-primary' : 'hover:opacity-90'
                  }`}
                >
                  <CoverImage
                    src={pick.coverSrc}
                    fallbackSrc={pick.coverFallback}
                    alt=''
                    width={96}
                    height={144}
                    fallback={
                      <span className='flex aspect-2/3 items-center justify-center bg-sunken p-1 text-[10px] text-text-subtle'>
                        {pick.book.title}
                      </span>
                    }
                    className='aspect-2/3 h-auto w-full object-cover'
                  />
                  {on && (
                    <span className='absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground'>
                      <Check aria-hidden='true' className='size-3' />
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

      <div className='mt-8'>
        {selected.length > 0 ? (
          <>
            <h3 className='text-sm font-medium text-text-subtle'>내 책장</h3>
            <div className='mt-2'>
              <PreviewShelf picks={selected} />
            </div>
            <p
              aria-live='polite'
              className='mt-4 break-keep font-medium text-text-strong'
            >
              {message}
            </p>
            {isFull && (
              <p className='mt-1 text-xs text-text-subtle'>
                한 번에 {MAX_PENDING_BOOKS}권까지 꽂을 수 있어요.
              </p>
            )}
            <Button size='lg' className='mt-4 px-8' onClick={handleSave}>
              책장 저장하기
            </Button>
          </>
        ) : (
          <GoalStarter />
        )}
      </div>
    </section>
  );
};
