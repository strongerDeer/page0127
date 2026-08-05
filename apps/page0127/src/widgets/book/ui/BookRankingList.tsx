import Link from 'next/link';

import { BookCover } from '@repo/ui';
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
/**
 * 근거 수치를 화면에 적는 최소 인원.
 *
 * 왜 감추나: 1~2명일 때 "1명이 완독"을 그대로 박으면, 처음 온 사람은 랭킹이 아니라
 * **아무도 안 쓰는 서비스**를 본다. 순위 자체는 여전히 맞다 — 적은 표본을 크게 말하지
 * 않을 뿐이다. 숫자를 지어내는 것(“오늘 0권 완독” 같은 문구)과는 반대 방향의 처방이다.
 *
 * 이 값 아래에서는 줄을 통째로 지운다. 표지·순위·제목·저자 네 필드가 남아
 * 발견 면의 밀도는 그대로다(00_docs/07 §6-9).
 */
const MIN_COUNT_TO_SHOW = 3;

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
        <h2 className='heading-2'>{title}</h2>
        <div className='flex shrink-0 items-baseline gap-3'>
          {meta && <span className='text-xs text-text-subtle'>{meta}</span>}
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
                      rank <= 3 ? 'text-text-strong' : 'text-text-subtle'
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
                <BookCover
                  src={book.cover_image}
                  title={book.title}
                  decorative
          size='sm'
        />

                <div className='min-w-0 flex-1'>
                  <p className='truncate text-base font-medium text-text-strong group-hover:underline'>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className='mt-0.5 truncate text-sm text-text-subtle'>
                      {book.author}
                    </p>
                  )}
                  {/* 랭킹 근거 수치 — 발견 면의 마지막 필드.
                      표본이 얇으면 적지 않는다(MIN_COUNT_TO_SHOW 참조) */}
                  {item.count >= MIN_COUNT_TO_SHOW && (
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
                        {type === 'best' ? '명의 인생책' : '명이 완독'}
                      </span>
                    </p>
                  )}
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
