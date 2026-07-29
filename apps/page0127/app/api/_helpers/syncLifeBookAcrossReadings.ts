import type { SupabaseClient } from '@supabase/supabase-js';

type SyncArgs = {
  supabase: SupabaseClient;
  userId: string;
  /** 대상 책의 ISBN. 비어 있으면(수기 등록) 묶을 근거가 없어 아무것도 하지 않는다 */
  isbn: string | null | undefined;
  /** 맞출 값 */
  isLifeBook: boolean;
  /** 이미 저장된 행 — 다시 쓸 필요가 없어 제외한다 */
  exceptBookId?: string;
};

/**
 * 인생책 값을 같은 책의 모든 회독에 맞춘다.
 *
 * 인생책은 '회독'이 아니라 **'책'을 꼽은 것**이다. 재독은 books 에 새 행으로
 * 저장되므로(회독마다 완독일·평점·리뷰가 따로 있어야 한다), 값을 한 행에만 쓰면
 * 같은 책인데 회독마다 인생책 여부가 갈린다.
 *
 * 그러면 책장과 상세가 어긋난다 — 책장은 회독을 한 권으로 합쳐 "인생책"으로
 * 세우는데, 눌러서 들어가면 최신 회독 행이 열리며 "인생책이 아님"으로 보인다.
 *
 * 그래서 쓰기 시점에 같은 책의 모든 회독을 함께 갱신한다.
 * 기존 데이터는 마이그레이션 20260729000001 이 같은 규칙으로 백필했다.
 *
 * 실패해도 **본 요청은 살린다** — 회독 간 동기화가 안 됐다고 사용자가 방금 누른
 * 수정 자체를 되돌리는 건 과하다. 화면상 어긋남은 다음 저장 때 회복된다.
 */
export const syncLifeBookAcrossReadings = async ({
  supabase,
  userId,
  isbn,
  isLifeBook,
  exceptBookId,
}: SyncArgs): Promise<void> => {
  if (!isbn) return;

  let query = supabase
    .from('books')
    .update({ is_life_book: isLifeBook, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('isbn', isbn)
    // 이미 같은 값인 행까지 건드리면 updated_at 만 무의미하게 바뀐다
    .neq('is_life_book', isLifeBook);

  if (exceptBookId) query = query.neq('id', exceptBookId);

  const { error } = await query;

  if (error) {
    console.error('회독 간 인생책 동기화 실패:', error.message);
  }
};

/**
 * 이 책을 이미 인생책으로 꼽은 적이 있는지 확인한다.
 *
 * 재독을 등록할 때 쓴다 — 1회독 때 인생책으로 꼽았다면 2회독 기록도 인생책이어야
 * 한다. 등록 폼의 체크가 꺼져 있다는 이유로 새 행만 false 로 들어가면
 * 같은 책의 회독끼리 값이 갈린다.
 */
export const hasLifeBookReading = async (
  supabase: SupabaseClient,
  userId: string,
  isbn: string | null | undefined
): Promise<boolean> => {
  if (!isbn) return false;

  const { data, error } = await supabase
    .from('books')
    .select('id')
    .eq('user_id', userId)
    .eq('isbn', isbn)
    .eq('is_life_book', true)
    .limit(1);

  if (error) {
    console.error('인생책 회독 조회 실패:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
};
