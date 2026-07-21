import Image from 'next/image';
import Link from 'next/link';

import type { Book } from '@/entities/book';

type BookFeedGridProps = {
  /** 표시할 책 — 검색/필터가 적용된 목록 */
  books: Book[];
  /** 완독 순서 기준 번호 (book.id → 1부터 시작하는 순번). DashboardBookList가
   *  필터와 무관한 원본 목록 기준으로 미리 계산해 넘긴다 */
  rankMap: Map<string, number>;
  /** 책 클릭 시 이동할 URL 생성 함수 */
  bookHref: (book: Book) => string;
};

/**
 * 피드형 렌더러 — 번호가 매겨진 "선반 칸"처럼 보이는 표지 카드 그리드
 *
 * 학습 포인트:
 * - 번호는 이 컴포넌트가 계산하지 않는다. rankMap을 조회만 한다.
 *   그래야 검색/카테고리 필터를 걸어도 같은 책은 항상 같은 번호를 유지한다.
 * - 표지 없는 책의 fallback(제목 조판)은 BookGridItem과 동일한 패턴 —
 *   책장형/그리드형/피드형이 같은 "표지 없을 때" 규칙을 공유한다.
 * - 카드 하단에 얇은 밴드를 둬서 "선반 칸에 꽂힌 책" 느낌을 준다 —
 *   제목은 카드 밖 텍스트 대신 title 속성(hover 툴팁)과 이미지 alt로 대체한다.
 */
export const BookFeedGrid = ({
  books,
  rankMap,
  bookHref,
}: BookFeedGridProps) => {
  if (books.length === 0) {
    return (
      <div className='rounded-2xl bg-sunken p-12 text-center'>
        <p className='text-text-body'>조건에 맞는 책이 없어요.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'>
      {books.map((book) => {
        const rank = rankMap.get(book.id);

        return (
          <Link
            key={book.id}
            href={bookHref(book)}
            title={book.title}
            // 카드 전체를 정사각형(aspect-square)으로 고정한다. bg-muted가
            // 카드 전체의 "배경"이 되고, 표지는 그 위에 중간 크기로 얹힌 것처럼 보이게 한다
            className='group flex aspect-square flex-col overflow-hidden rounded-md border border-line-soft bg-muted transition-transform hover:-translate-y-0.5 hover:shadow-md'
          >
            {rank !== undefined && (
              <div className='pt-3 text-center leading-none'>
                <p className='text-[10px] font-bold tracking-[0.2em] text-text-faint'>
                  BOOK
                </p>
                <p className='text-xl font-black text-text-strong'>
                  #{String(rank).padStart(3, '0')}
                </p>
              </div>
            )}

            {/* min-h-0: flex 자식이 내용 크기만큼 늘어나지 않고 남는 공간만 채우게 함
                object-contain + 안쪽 padding: 표지를 배경 위에 중간 크기로 띄운다 (꽉 채우지 않음) */}
            <div className='relative min-h-0 flex-1 px-6 py-2'>
              {book.cover_image ? (
                <Image
                  src={book.cover_image}
                  alt={book.title}
                  fill
                  sizes='(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw'
                  className='object-contain drop-shadow-md'
                />
              ) : (
                <div className='flex h-full w-full flex-col justify-center gap-1 rounded-sm bg-card px-3 py-2.5 text-left shadow-sm'>
                  <p className='line-clamp-4 break-keep text-[11px] font-bold leading-snug text-text-strong'>
                    {book.title}
                  </p>
                  {book.author && (
                    <p className='line-clamp-1 text-[10px] text-text-faint'>
                      {book.author}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 선반 명패처럼 보이는 하단 워터마크 밴드 — 배경(bg-muted)보다 한 톤 더 짙게 */}
            <div className='shrink-0 bg-line px-2 py-1.5 text-center'>
              <p className='text-[9px] font-semibold uppercase tracking-[0.2em] text-text-subtle'>
                page0127
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
