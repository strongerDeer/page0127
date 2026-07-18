import Image from 'next/image';
import Link from 'next/link';

import { Check, Heart } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import { RankDeltaBadge } from './RankDeltaBadge';

import type { BookRanking } from '@/entities/book';

/**
 * 랭킹 리스트 (순위 행 형태)
 *
 * 왜 표지 그리드가 아니라 행 리스트인가 (00_docs/07 §6-9):
 * - 발견을 파는 면은 필드를 감춘다 — 교보 베스트 카드는 표지+순위+제목+변동 4필드뿐
 * - 그리드는 칸이 안 차면 "데이터가 없다"는 걸 광고한다.
 *   행 리스트는 3권이어도, 10권이어도 같은 밀도로 읽힌다.
 * - 순위 숫자 아래 변동 뱃지(▲12·NEW) — 어제 스냅샷이 있어야만 뜨는,
 *   "매일 집계가 돌고 있다"는 증거 (RankDeltaBadge 참조)
 * - 좋아요 버튼은 여기 두지 않는다 — 비교·행동은 책 정보 페이지의 일이다.
 */
type BookRankingListProps = {
  title: string;
  /** 집계 기준일 등 — 제목 우측에 붙는 메타 정보 */
  meta?: string;
  books: BookRanking[];
  type: 'best' | 'most';
  myReadIsbns?: string[];
};

export const BookRankingList = ({
  title,
  meta,
  books,
  type,
  myReadIsbns = [],
}: BookRankingListProps) => {
  if (!books || books.length === 0) return null;

  return (
    <section>
      <div className='mb-3 flex items-baseline justify-between gap-4'>
        <h2 className='heading-2 text-text-strong'>{title}</h2>
        <div className='flex shrink-0 items-baseline gap-3'>
          {meta && <span className='text-xs text-text-faint'>{meta}</span>}
          <Link
            href='/books/all'
            className='text-sm text-text-subtle transition-colors hover:text-text-strong'
          >
            전체보기
          </Link>
        </div>
      </div>

      {/* 흰 바탕 위 구분선 리스트 — 박스로 감싸지 않는다 (교보 리스트 문법) */}
      <ol className='divide-y divide-line-soft border-t border-line'>
        {books.map((item, index) => {
          const book = item.book_info;
          const rank = item.rank ?? index + 1;
          const isRead = myReadIsbns.includes(book.isbn);

          return (
            <li key={item.isbn}>
              <Link
                href={`/books/info/${book.id}`}
                className='group flex items-center gap-4 py-3.5'
              >
                {/* 순위 + 변동 — 1~3위만 잉크색으로 세운다 */}
                <span className='flex w-7 shrink-0 flex-col items-center gap-0.5'>
                  <span
                    aria-hidden='true'
                    className={cn(
                      'text-base font-bold tabular-nums',
                      rank <= 3 ? 'text-text-strong' : 'text-text-faint'
                    )}
                  >
                    {rank}
                  </span>
                  <span className='sr-only'>{rank}위</span>
                  <RankDeltaBadge
                    delta={item.rank_delta}
                    isNew={item.is_new}
                    hasHistory={item.has_history}
                  />
                </span>

                {/* 표지 — 높이만 고정하고 판형(가로 비율)은 원본대로 둔다 */}
                {book.cover_image ? (
                  <Image
                    src={book.cover_image}
                    alt=''
                    width={56}
                    height={80}
                    className='book-cover h-20 w-auto shrink-0'
                  />
                ) : (
                  <span
                    aria-hidden='true'
                    className='book-cover flex h-20 w-14 shrink-0 items-center justify-center bg-sunken p-1 text-center text-[10px] leading-tight text-text-faint'
                  >
                    {book.title.slice(0, 12)}
                  </span>
                )}

                <div className='min-w-0 flex-1'>
                  <p className='truncate text-[15px] font-medium text-text-strong group-hover:underline'>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className='mt-0.5 truncate text-[13px] text-text-subtle'>
                      {book.author}
                    </p>
                  )}
                  {/* 랭킹 근거 수치 — 발견 면의 마지막 필드 */}
                  <p className='mt-1 flex items-center gap-1 text-xs text-text-subtle'>
                    {type === 'best' && (
                      <Heart
                        aria-hidden='true'
                        className='size-3 fill-rank-up text-rank-up'
                      />
                    )}
                    <span>
                      <b className='font-medium text-text-body'>
                        {item.count}
                      </b>
                      {type === 'best' ? '명이 10점' : '명이 완독'}
                    </span>
                  </p>
                </div>

                {/* 내가 완독한 책 — 완독 표시는 브랜드 블루의 직무다 */}
                {isRead && (
                  <span className='flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground'>
                    <Check aria-hidden='true' className='size-3' />
                    읽음
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
