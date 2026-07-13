import { createClient } from '@/shared/config/supabase/server';

import { BookRankingList } from '@/widgets/book/ui/BookRankingList';

import type { BookRanking, GlobalBook } from '@/entities/book';

/**
 * 책 랭킹 영역 Server Component
 *
 * 학습 포인트:
 * - 자기 자신이 필요한 RPC만 fetch → page.tsx의 직렬 await에서 분리
 * - type prop으로 두 종류(best/most)의 랭킹을 단일 컴포넌트로 처리
 * - <Suspense> 안에 두면 이 컴포넌트의 RPC만 끝나면 그 부분만 스트리밍됨
 */

type BookRankingSectionProps = {
  type: 'best' | 'most';
  title: string;
  /** 집계 기준일 등 — 제목 우측 메타 */
  meta?: string;
  myReadIsbns?: string[];
  myLikedIds?: string[];
  isLoggedIn?: boolean;
};

const RPC_BY_TYPE = {
  best: 'get_books_of_life',
  most: 'get_most_read_books',
} as const;

// RPC 결과 JSONB → 런타임 모양만 타입으로 좁힘
type RankingRow = { isbn: string; count: number; book_info: unknown };

export const BookRankingSection = async ({
  type,
  title,
  meta,
  myReadIsbns,
  myLikedIds,
  isLoggedIn,
}: BookRankingSectionProps) => {
  const supabase = await createClient();

  const { data } = await supabase.rpc(RPC_BY_TYPE[type], { limit_count: 5 });

  const books: BookRanking[] = ((data as RankingRow[] | null) ?? []).map(
    (item) => ({
      isbn: item.isbn,
      count: item.count,
      book_info: item.book_info as GlobalBook,
    })
  );

  if (books.length === 0) return null;

  return (
    <BookRankingList
      title={title}
      meta={meta}
      books={books}
      type={type}
      myReadIsbns={myReadIsbns}
      myLikedIds={myLikedIds}
      isLoggedIn={isLoggedIn}
    />
  );
};
