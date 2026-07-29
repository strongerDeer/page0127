import { createClient } from '@/shared/config/supabase/server';

import type { Book } from '../types';

/** 회독 목록 한 줄에 필요한 만큼만 */
export type BookReading = Pick<
  Book,
  | 'id'
  | 'read_count'
  | 'status'
  | 'completed_date'
  | 'rating'
  | 'is_life_book'
  | 'one_line_review'
  | 'is_public'
>;

/**
 * 같은 책의 회독 기록을 모두 가져온다 (Server Component용)
 *
 * 왜 필요한가: 재독은 books 에 새 행으로 저장되는데, 책장은 회독을 한 권으로
 * 합쳐 **최신 회독**만 링크한다. 그래서 합치기를 넣은 뒤로 옛 회독의 평점·한줄평을
 * 열어볼 길이 사라졌다. 상세 페이지가 이 목록으로 그 길을 되돌려 준다.
 *
 * 묶는 기준은 ISBN 이다 — 앱의 다른 곳과 같은 규칙
 * (entities/book/model/dedupeReadings.ts). ISBN 이 비어 있는 수기 등록 책은
 * 묶을 근거가 없으므로 자기 자신만 돌려준다.
 *
 * @param userId 책장 주인
 * @param isbn 대상 책의 ISBN
 * @param includePrivate 소유자 여부. 방문자에게는 공개 기록만 보여준다
 *        (RLS 는 익명 방문자만 걸러주므로 조건을 코드에서도 명시한다)
 */
export const getBookReadings = async (
  userId: string,
  isbn: string | null,
  includePrivate: boolean
): Promise<BookReading[]> => {
  if (!isbn) return [];

  const supabase = await createClient();

  let query = supabase
    .from('books')
    .select(
      'id, read_count, status, completed_date, rating, is_life_book, one_line_review, is_public'
    )
    .eq('user_id', userId)
    .eq('isbn', isbn)
    // 최근에 읽은 회독을 위에 둔다
    .order('read_count', { ascending: false });

  if (!includePrivate) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('회독 기록 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};
