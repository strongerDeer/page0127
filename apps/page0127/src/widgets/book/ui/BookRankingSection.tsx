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
 *
 * 순위 변동(▲12)과 마이그레이션 순서:
 * - get_book_ranking_with_delta 는 20260713 마이그레이션에서 생긴다.
 * - 코드가 DB보다 먼저 배포될 수 있으므로(=함수가 아직 없을 수 있으므로)
 *   실패하면 **기존 RPC로 폴백**한다. 그래야 랭킹 섹션이 통째로 사라지지 않는다.
 * - 폴백 시에는 has_history=false → RankDeltaBadge가 아무것도 그리지 않는다.
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

// RPC 결과 JSONB → 런타임 모양만 타입으로 좁힘
type DeltaRankingRow = {
  isbn: string;
  count: number;
  book_info: unknown;
  rank: number;
  rank_delta: number | null;
  is_new: boolean;
  has_history: boolean;
};

type LegacyRankingRow = {
  isbn: string;
  count: number;
  book_info: unknown;
};

// 마이그레이션 이전 함수 — 폴백 전용
const LEGACY_RPC_BY_TYPE = {
  best: 'get_books_of_life',
  most: 'get_most_read_books',
} as const;

const LIMIT = 5;

const fetchRanking = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: 'best' | 'most'
): Promise<BookRanking[]> => {
  const { data, error } = await supabase.rpc('get_book_ranking_with_delta', {
    rank_type_param: type,
    limit_count: LIMIT,
  });

  if (!error) {
    return ((data as DeltaRankingRow[] | null) ?? []).map((item) => ({
      isbn: item.isbn,
      count: item.count,
      book_info: item.book_info as GlobalBook,
      rank: item.rank,
      rank_delta: item.rank_delta,
      is_new: item.is_new,
      has_history: item.has_history,
    }));
  }

  // 함수가 아직 DB에 없다(마이그레이션 미적용) → 기존 랭킹이라도 보여준다.
  // 조용히 빈 배열을 반환하면 "책이 없음"과 "함수가 없음"이 구분되지 않는다.
  console.warn(
    `[ranking] get_book_ranking_with_delta 실패 → 기존 RPC로 폴백합니다. ` +
      `20260713_create_ranking_snapshots.sql 을 적용하면 순위 변동이 표시됩니다. ` +
      `(${error.message})`
  );

  const { data: legacyData } = await supabase.rpc(LEGACY_RPC_BY_TYPE[type], {
    limit_count: LIMIT,
  });

  return ((legacyData as LegacyRankingRow[] | null) ?? []).map(
    (item, index) => ({
      isbn: item.isbn,
      count: item.count,
      book_info: item.book_info as GlobalBook,
      rank: index + 1,
      rank_delta: null,
      is_new: false,
      // 비교할 이력이 없다 → 뱃지를 그리지 않는다
      has_history: false,
    })
  );
};

export const BookRankingSection = async ({
  type,
  title,
  meta,
  myReadIsbns,
  myLikedIds,
  isLoggedIn,
}: BookRankingSectionProps) => {
  const supabase = await createClient();
  const books = await fetchRanking(supabase, type);

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
