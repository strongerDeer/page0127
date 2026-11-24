import { createAdminClient } from '@/shared/config/supabase/admin';

import {
  countSentencesByMonth,
  type SentenceMonthCounts,
} from '../model/sentenceMonthCounts';

import 'server-only';

/**
 * 방문자 서재 캘린더용 — 이 사람이 달마다 모은 문장 "개수"만.
 *
 * book_quotes·sentence_draws 는 RLS 가 본인만 읽게 막아 두었다(문장은 나만 보기, HJ 2026-11-09).
 * 방문자에게는 개수만 보이기로 해서(HJ, 2026-11-24) service_role 로 읽되,
 * select 에서부터 날짜 칸 하나만 가져오고 서버에서 달별 숫자로 접은 뒤에만 넘긴다
 * (비공개 책을 가려 세는 getMaskedPrivateBooks 와 같은 방식).
 */
export const getSentenceMonthCounts = async (
  userId: string
): Promise<SentenceMonthCounts> => {
  try {
    const admin = createAdminClient();
    const [quotes, draws] = await Promise.all([
      admin.from('book_quotes').select('created_at').eq('user_id', userId),
      admin.from('sentence_draws').select('draw_date').eq('user_id', userId),
    ]);

    if (quotes.error || draws.error) {
      console.error(
        '모은 문장 수 조회 실패:',
        quotes.error?.message ?? draws.error?.message
      );
      return {};
    }

    return countSentencesByMonth({
      quoteCreatedAts: (quotes.data ?? []).map((row) => row.created_at),
      drawDates: (draws.data ?? []).map((row) => row.draw_date),
    });
  } catch (error) {
    // 키가 없는 로컬 등 — 개수 줄만 안 보이면 된다
    console.error('모은 문장 수 조회 실패:', error);
    return {};
  }
};
