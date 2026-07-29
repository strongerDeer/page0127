import { createAnonClient } from '@/shared/config/supabase/anon';

/** 공유 카드에 들어가는 책장 요약 */
export type PublicShelfSummary = {
  /** 공개된 완독 권수 */
  totalBooks: number;
  /** 그중 인생책 권수 */
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
 * 조회 실패는 **각각 격리한다** — 인생책 한 줄 때문에 총 권수까지 버리지 않는다.
 * 카드가 깨지는 것보다 빈 선반이 낫지만, 아는 숫자까지 버릴 이유는 없다.
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

  const [totalResult, lifeResult] = await Promise.all([
    publicCompleted(),
    // 인생책은 books.is_life_book 컬럼이다. 예전에는 rating=10 이라는 매직값이었지만
    // 20260728000005 마이그레이션이 그 행들을 rating=5 + is_life_book=true 로 백필하고
    // CHECK 에서 10 을 뺐다 — 옛 조건을 그대로 두면 조용히 0 만 세게 된다.
    publicCompleted().eq('is_life_book', true),
  ]);

  // 총 권수를 못 세면 카드에 쓸 것이 없다 — 빈 선반으로 떨어진다
  if (totalResult.error) {
    console.error('공개 책장 권수 조회 실패:', totalResult.error.message);
    return { totalBooks: 0, lifeBooks: 0 };
  }

  const totalBooks = totalResult.count ?? 0;

  // 인생책만 실패했으면 그 줄만 뺀다. 예전에는 둘 중 하나만 실패해도 0/0 을 돌려줬는데,
  // is_life_book 컬럼이 아직 없던 배포 직후 그 경로를 타면서 155권 읽은 책장이
  // "빈 선반"으로 나갔다(2026-07-29). 크롤러가 그 카드를 한동안 들고 있으므로,
  // 한쪽이 죽어도 살아 있는 숫자는 내보낸다.
  if (lifeResult.error) {
    console.error('인생책 권수 조회 실패:', lifeResult.error.message);
    return { totalBooks, lifeBooks: 0 };
  }

  return { totalBooks, lifeBooks: lifeResult.count ?? 0 };
};
