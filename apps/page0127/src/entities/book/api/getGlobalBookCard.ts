import { createAnonClient } from '@/shared/config/supabase/anon';

import { summarizeRatings } from '../model/rating';

/** 도서 상세(/books/info/[id]) 공유 카드에 쓰는 필드 */
export type GlobalBookCard = {
  title: string;
  author: string | null;
  cover_image: string | null;
  /** 공개 완독 수 */
  completedCount: number;
  /** 평균 평점(소수 1자리). 평가가 없으면 0 */
  avgRating: number;
};

/**
 * 도서 상세 공유 카드용 조회.
 *
 * 숫자의 기준은 도서 상세 페이지의 getBookStats 와 같게 맞춘다 — 카드에 "12명이
 * 완독"이라 적혔는데 눌러 들어간 화면이 9명이면 둘 중 하나는 거짓말이 된다.
 * 기준: 같은 isbn + status='completed' + is_public=true.
 *
 * 페이지 쪽과 달리 익명 클라이언트를 쓴다. 공유 카드는 누가 보든 같아야 하고,
 * 로그인 사용자의 비공개 기록이 섞이면 안 된다.
 */
export const getGlobalBookCard = async (
  id: string
): Promise<GlobalBookCard | null> => {
  const supabase = createAnonClient();

  const { data: book, error } = await supabase
    .from('global_books')
    .select('title, author, cover_image, isbn')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('도서 카드 조회 실패:', error.message);
    return null;
  }
  if (!book) return null;

  const { data: rows, error: statsError } = await supabase
    .from('books')
    .select('rating')
    .eq('isbn', book.isbn)
    .eq('status', 'completed')
    .eq('is_public', true);

  // 숫자를 못 세면 0 으로 둔다 — 카드는 숫자 없이 제목으로 떨어진다
  if (statsError) {
    console.error('도서 카드 통계 조회 실패:', statsError.message);
  }

  const ratings = (rows ?? []).map((row) => row.rating as number | null);

  return {
    title: book.title,
    author: book.author,
    cover_image: book.cover_image,
    completedCount: ratings.length,
    avgRating: summarizeRatings(ratings).average,
  };
};
