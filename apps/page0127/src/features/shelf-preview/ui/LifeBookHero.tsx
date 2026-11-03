'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, cn,CoverImage } from '@repo/ui';
import { ArrowRight, BookOpen, Crown } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { withLifeBook } from '../model/lifeBook';
import { toPendingLoginPath } from '../model/loginTransfer';
import { readPendingShelf, writePendingShelf } from '../model/pendingShelf';
import { restoreSelection } from '../model/restoreSelection';
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
 * - 기본은 **찾기**다. 리더 인생책 줄은 지름길 — 누르면 검색으로 고른 것처럼 위 빈 카드에 꽂힌다(2026-11-03).
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

  // 검색과 리더 줄 모두 같은 자리(위 카드)를 채운다 — 깔때기에서 나눠 보도록 source 만 다르다
  const slotRef = useRef<HTMLDivElement>(null);
  const handlePick = (pick: ShelfPick, source: 'search' | 'leader') => {
    trackEvent('shelf_preview_pick', { source, count: 1, life: true });
    setChosen(pick);
    if (source === 'leader') {
      // 모바일에서는 리더 줄을 누를 때 위 카드가 화면 밖일 수 있다 → 꽂힌 자리를 보여 준다.
      // 'nearest' 라 이미 보이면 움직이지 않는다.
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      requestAnimationFrame(() =>
        slotRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: reduce ? 'auto' : 'smooth',
        })
      );
    }
  };

  const handleSave = () => {
    if (!chosen) return;
    trackEvent('shelf_preview_save', { count: 1, life: true });
    const pending = withLifeBook(readPendingShelf(), chosen.book);
    writePendingShelf(pending);
    router.push(toPendingLoginPath(pending));
  };

  return (
    // id: 홈 첫 화면의 "내 책장 만들어 보기"가 여기로 내려온다 — A 와 같은 자리(scroll-mt 로 GNB 에 안 가리게)
    <section
      id='first-impression'
      aria-labelledby='shelf-preview-title'
      className='page-width scroll-mt-20 py-20 md:py-28'
    >
      {/* 머리는 A 와 같은 문법(파란 라벨 → 큰 제목 → 회색 설명), 가운데 정렬.
          예전엔 A 의 공감 문장(기록이 흩어져요)을 같이 썼는데, 바로 위 "왜 page0127." 섹션과 겹쳐
          인생책 이야기로 바꿨다(2026-11-01) */}
      <div className='text-center'>
        <p className='text-sm font-bold text-primary'>인생책 한 권</p>
        <h2 id='shelf-preview-title' className='display-xl mt-2 text-balance'>
          당신의 인생책은?
        </h2>
        <p className='mx-auto mt-4 max-w-xl text-balance text-base text-text-subtle md:text-lg'>
          몇 번을 다시 읽어도 좋은, 마음에 오래 남은 한 권.
          <br />그 책으로 내 서재를 시작해 보세요.
        </p>
      </div>

      <div className='tint-cool mx-auto mt-12 flex max-w-2xl flex-col items-center rounded-3xl px-5 py-10 text-center md:mt-16 md:p-14'>
        <div ref={slotRef} className='scroll-my-24'>
          {chosen ? (
            <div className='relative w-36 md:w-44'>
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
              className='flex aspect-2/3 w-36 items-center justify-center rounded-lg border-2 border-dashed border-chart-6/60 bg-card/60 md:w-44'
            >
              <BookOpen className='size-10 text-chart-6/50' />
            </div>
          )}
        </div>

        {chosen ? (
          <div className='mt-6 w-full min-w-0'>
            <p className='break-keep text-lg font-bold text-text-strong md:text-xl'>
              {chosen.book.title}
            </p>
            {chosen.book.author && (
              <p className='mt-1 truncate text-sm text-text-subtle'>
                {chosen.book.author}
              </p>
            )}
            <div className='mt-5 flex flex-col items-center gap-2'>
              <Button
                size='lg'
                onClick={handleSave}
                className='h-14 w-full gap-2 px-7 text-base font-bold shadow-lg shadow-primary/30 sm:w-auto'
              >
                내 서재에 등록하기
                <ArrowRight aria-hidden='true' className='size-5' />
              </Button>
              <p className='text-xs text-text-subtle'>
                무료 · 구글·카카오로 10초 가입
              </p>
              <button
                type='button'
                onClick={() => setChosen(null)}
                className='rounded-md px-2 py-1.5 text-sm font-medium text-text-subtle hover:bg-primary/10 hover:text-text-strong'
              >
                다른 책 찾기
              </button>
            </div>
          </div>
        ) : (
          <div className='mt-6 w-full'>
            <ShelfSearch
              defaultOpen
              centered
              placeholder='책 제목이나 저자'
              // 검색칸은 아직 고르기 전에만 보인다 — 고른 책이 없으니 표시할 것도 없다
              isSelected={() => false}
              disabled={false}
              onPick={(pick) => handlePick(pick, 'search')}
            />
          </div>
        )}

        {/* 고른 순간을 화면낭독기 사용자도 듣게 한다 */}
        <p aria-live='polite' className='sr-only'>
          {chosen ? `${chosen.book.title}을 인생책으로 골랐어요.` : ''}
        </p>

        {leaders.length > 0 && (
          <div className='mt-10 w-full border-t border-line-soft pt-8'>
            <p className='text-sm font-bold text-text-strong md:text-base'>
              리더들이 뽑은 인생책이에요
            </p>
            <p className='mt-1 text-xs text-text-subtle'>
              같은 책이 있다면 눌러서 바로 골라 보세요
            </p>
            <ul className='mx-auto mt-4 grid max-w-md grid-cols-5 gap-2 md:gap-3'>
              {leaders.map((leader) => {
                const selected = chosen?.book.isbn === leader.book.isbn;
                return (
                  <li key={leader.book.isbn}>
                    {/* 누르면 위 카드에 꽂힌다. 고른 책은 위 카드와 같은 민트 테두리로 표시 */}
                    <button
                      type='button'
                      aria-pressed={selected}
                      aria-label={`${leader.book.title} 인생책으로 고르기`}
                      onClick={() => handlePick(leader, 'leader')}
                      className={cn(
                        'block w-full rounded-md transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                        selected && '-translate-y-1'
                      )}
                    >
                      <CoverImage
                        src={leader.coverSrc}
                        fallbackSrc={leader.coverFallback}
                        alt=''
                        width={96}
                        height={144}
                        fallback={
                          <span className='flex aspect-2/3 items-center justify-center overflow-hidden rounded-md bg-sunken p-1 text-[10px] text-text-subtle'>
                            <span className='line-clamp-4'>
                              {leader.book.title}
                            </span>
                          </span>
                        }
                        className={cn(
                          'aspect-2/3 h-auto w-full rounded-md object-cover shadow-md',
                          selected
                            ? 'ring-2 ring-chart-6'
                            : 'ring-1 ring-text-strong/10'
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
