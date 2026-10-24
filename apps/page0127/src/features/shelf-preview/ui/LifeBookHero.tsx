'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, CoverImage } from '@repo/ui';
import { ArrowRight, BookOpen, Crown } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { withLifeBook } from '../model/lifeBook';
import { toPendingLoginPath } from '../model/loginTransfer';
import { readPendingShelf, writePendingShelf } from '../model/pendingShelf';
import { restoreSelection } from '../model/restoreSelection';
import { isSameBook } from '../model/selection';
import { ShelfSearch } from './ShelfSearch';

import type { LeaderLifeBook } from '../model/leaderLifeBooks';
import type { ShelfPick } from '../model/types';

type LifeBookHeroProps = {
  /** 리더들이 뽑은 인생책 — 비어 있으면 줄을 그리지 않는다 */
  leaders: LeaderLifeBook[];
};

/**
 * 비로그인 홈의 히어로 B — "당신의 인생책은?" 한 권을 검색해서 찾는다.
 * 설계: docs/superpowers/specs/2026-10-23-life-book-hero-ab-design.md
 *
 * 학습 포인트:
 * - A(ShelfPreview)와 섞지 않고 따로 둔다. 실험 중에는 대조군 화면이 조금도 바뀌면 안 된다.
 * - 고르기가 아니라 **찾기**다. 리더 인생책 줄은 보여주기만 한다(누르는 대상이 아니다).
 * - 인원 수·투표 같은 숫자는 넣지 않는다 — 가입 전에 올라가는 숫자는 사실과 다르다.
 */
export const LifeBookHero = ({ leaders }: LifeBookHeroProps) => {
  const router = useRouter();
  const [chosen, setChosen] = useState<ShelfPick | null>(null);

  // 다시 온 방문자: 찾아 두고 로그인하지 않은 채 떠났다면 그 책을 되살린다.
  // 저장소는 브라우저에만 있어 서버 렌더 때는 읽을 수 없다 → 마운트 후 한 번.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const pending = readPendingShelf();
    const life = pending?.books.find((b) => b.isbn === pending.lifeBookIsbn);
    if (!life) return;
    const [pick] = restoreSelection(
      [life],
      [],
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 마운트 후에만 읽힌다
    setChosen(pick ?? null);
  }, []);

  const handlePick = (pick: ShelfPick) => {
    trackEvent('shelf_preview_pick', {
      source: 'search',
      count: 1,
      life: true,
    });
    setChosen(pick);
  };

  const handleSave = () => {
    if (!chosen) return;
    trackEvent('shelf_preview_save', { count: 1, life: true });
    const pending = withLifeBook(readPendingShelf(), chosen.book);
    writePendingShelf(pending);
    router.push(toPendingLoginPath(pending));
  };

  return (
    <section
      aria-labelledby='shelf-preview-title'
      className='tint-cool grid gap-x-16 gap-y-10 rounded-3xl px-5 py-8 md:p-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'
    >
      <div>
        {/* h1 은 A 와 같다 — 검색 노출 문장을 실험으로 흔들지 않는다 */}
        <h1
          id='shelf-preview-title'
          className='break-keep text-3xl font-extrabold leading-tight tracking-tight text-text-strong md:text-5xl'
        >
          책장을 보면,
          <br />그 사람이 보인다.
        </h1>

        <h2 className='mt-8 text-2xl font-extrabold text-text-strong md:mt-10 md:text-4xl'>
          당신의 인생책은?
        </h2>

        <div className='mt-5 flex flex-col gap-5 sm:flex-row sm:items-end md:mt-6'>
          {chosen ? (
            <div className='relative w-36 shrink-0 md:w-48'>
              <CoverImage
                src={chosen.coverSrc}
                fallbackSrc={chosen.coverFallback}
                alt={`${chosen.book.title} (내 인생책)`}
                width={192}
                height={288}
                fallback={
                  <span className='flex aspect-2/3 items-center justify-center rounded-lg bg-card p-3 text-center text-sm text-text-subtle ring-4 ring-chart-6'>
                    {chosen.book.title}
                  </span>
                }
                className='aspect-2/3 h-auto w-full rounded-lg object-cover shadow-xl ring-4 ring-chart-6'
              />
              <span className='absolute -top-3 -right-3 flex size-9 items-center justify-center rounded-full bg-chart-6 text-white shadow-md'>
                <Crown aria-hidden='true' className='size-5' />
              </span>
            </div>
          ) : (
            // 빈 자리 — 여기에 내 인생책이 꽂힌다는 것을 모양으로 보여 준다
            <div
              aria-hidden='true'
              className='flex aspect-2/3 w-36 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-chart-6/60 bg-card/60 md:w-48'
            >
              <BookOpen className='size-10 text-chart-6/50' />
            </div>
          )}

          {chosen && (
            <div className='min-w-0'>
              <p className='break-keep text-lg font-bold text-text-strong md:text-xl'>
                {chosen.book.title}
              </p>
              {chosen.book.author && (
                <p className='mt-1 truncate text-sm text-text-subtle'>
                  {chosen.book.author}
                </p>
              )}
              <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2'>
                <Button
                  size='lg'
                  onClick={handleSave}
                  className='h-14 w-full gap-2 px-7 text-base font-bold shadow-lg shadow-primary/30 sm:w-auto'
                >
                  내 서재에 등록하기
                  <ArrowRight aria-hidden='true' className='size-5' />
                </Button>
                <button
                  type='button'
                  onClick={() => setChosen(null)}
                  className='rounded-md px-2 py-1.5 text-sm font-medium text-text-subtle hover:bg-primary/10 hover:text-text-strong'
                >
                  다른 책 찾기
                </button>
              </div>
              <p className='mt-2 text-xs text-text-subtle'>
                무료 · 구글·카카오로 10초 가입
              </p>
            </div>
          )}
        </div>

        {/* 고른 순간을 화면낭독기 사용자도 듣게 한다 */}
        <p aria-live='polite' className='sr-only'>
          {chosen ? `${chosen.book.title}을 인생책으로 골랐어요.` : ''}
        </p>
      </div>

      <div className='flex flex-col'>
        <ShelfSearch
          defaultOpen
          placeholder='제목이나 저자로 찾아보세요'
          isSelected={(pick) =>
            chosen !== null && isSameBook(pick.book, chosen.book)
          }
          disabled={false}
          onPick={handlePick}
        />

        {leaders.length > 0 && (
          <div className='mt-8 md:mt-auto md:pt-10'>
            <p className='text-sm font-bold text-text-strong md:text-base'>
              리더들이 뽑은 인생책이에요
            </p>
            <ul className='mt-3 grid grid-cols-5 gap-2 md:gap-4'>
              {leaders.map((book) => (
                <li key={book.isbn}>
                  <CoverImage
                    src={book.coverSrc}
                    fallbackSrc={book.coverFallback}
                    alt={book.title}
                    width={96}
                    height={144}
                    fallback={
                      <span className='flex aspect-2/3 items-center justify-center rounded-md bg-sunken p-1 text-[10px] text-text-subtle'>
                        {book.title}
                      </span>
                    }
                    className='aspect-2/3 h-auto w-full rounded-md object-cover shadow-md ring-1 ring-text-strong/10'
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
