import { createAnonClient } from '@/shared/config/supabase/anon';

/** 공유 카드에 들어가는 책장 요약 */
export type PublicShelfSummary = {
  /** 공개된 완독 권수 */
  totalBooks: number;
  /** 그중 인생책(rating 10) 권수 */
  lifeBooks: number;
};

/**
 * 공유 카드·메타데이터용 책장 요약 — 권수 두 개만 센다.
 *
 * getOverallStats 를 쓰지 않는 이유는 두 가지다.
 * 1. 그쪽은 책 row 를 통째로 select 해 연도별·카테고리별 분포까지 계산한다.
 *    카드에 필요한 건 숫자 두 개뿐이라 count 쿼리로 충분하다.
 * 2. 그쪽은 쿠키 기반 클라이언트를 쓴다. 공유 카드는 **누가 보든 같아야** 하므로
 *    세션을 읽지 않는 익명 클라이언트로 조회한다.
 *
 * 대신 **집계 술어는 getOverallStats 와 똑같이 맞춘다** — 카드에 "12권"이라 적혔는데
 * 링크를 눌러 들어간 화면의 통계가 9권이면 둘 중 하나는 거짓말이 된다.
 * 기준: status='completed' + completed_date 있음 + is_public=true
 * (완독일이 없는 책을 통계에서 빼는 것은 getOverallStats 41행의 규칙이다)
 *
 * 조회에 실패하면 0을 돌려준다 — 카드가 깨지는 것보다 빈 선반이 낫다.
 */
export const getPublicShelfSummary = async (
  userId: string
): Promise<PublicShelfSummary> => {
  const supabase = createAnonClient();

  const publicCompleted = () =>
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_date', 'is', null)
      .eq('is_public', true);

  const [
    { count: total, error: totalError },
    { count: life, error: lifeError },
  ] = await Promise.all([
    publicCompleted(),
    // 인생책 = rating 10 (entities/book/model/rating.ts 의 isLifeBook)
    publicCompleted().eq('rating', 10),
  ]);

  if (totalError || lifeError) {
    console.error(
      '공개 책장 요약 조회 실패:',
      totalError?.message ?? lifeError?.message
    );
    return { totalBooks: 0, lifeBooks: 0 };
  }

  return { totalBooks: total ?? 0, lifeBooks: life ?? 0 };
};
