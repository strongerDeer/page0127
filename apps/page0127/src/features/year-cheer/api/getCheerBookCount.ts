import { createAnonClient } from '@/shared/config/supabase/anon';

import { countShelf } from '@/entities/book';

/**
 * 그해 끝까지 읽은 책 수 — 응원 카드 첫 줄용. ⚠️ 서버 전용
 *
 * 서재 명함·공유 카드와 같은 countShelf 로 센다(재독은 한 권, 완독 연도를 모르는 책은 빼기).
 * **공개 완독 책만** 센다: 친구가 받은 링크와 스토리 이미지에도 이 숫자가 그대로 보이므로,
 * 비공개로 둔 책이 숫자로 새어 나가면 안 된다. 주인 화면도 같은 숫자를 써서 둘이 어긋나지 않게 한다.
 *
 * 연도는 인자로 받는다 — 1월에 링크를 열어도 "올해"가 아니라 응원 카드의 해(2026)를 센다.
 */
export const getCheerBookCount = async (
  userId: string,
  year: number
): Promise<number> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('books')
    .select('id, isbn, category, completed_date, completed_year')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('is_public', true);

  if (error) {
    console.error('응원 카드 권수 조회 실패:', error.message);
    return 0;
  }
  return countShelf(data ?? [], year).yearBooks;
};
