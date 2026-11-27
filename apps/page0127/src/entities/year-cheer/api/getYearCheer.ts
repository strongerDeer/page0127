import { createAnonClient } from '@/shared/config/supabase/anon';

import { type CheerSentence, findCheerSentence } from '../model/sentences';

export type YearCheer = {
  sentence: CheerSentence;
  /** 선물을 연 때(ISO) */
  openedAt: string;
};

/**
 * 이 사람이 그해 받은 응원 문장 — 아직 안 열었으면 null. ⚠️ 서버 전용
 *
 * 공개 읽기(anon)로 읽는다: 주인 화면·친구가 연 링크·스토리 이미지가 **같은 값**을 봐야 한다.
 * 저장된 id 가 목록에서 사라졌으면(지우면 안 되지만) 안 연 것처럼 null — 빈 카드를 그리지 않는다.
 */
export const getYearCheer = async (
  userId: string,
  year: number
): Promise<YearCheer | null> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('year_cheers')
    .select('sentence_id, opened_at')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle<{ sentence_id: string; opened_at: string }>();

  if (error) {
    console.error('응원 문장 조회 실패:', error.message);
    return null;
  }
  if (!data) return null;

  const sentence = findCheerSentence(data.sentence_id);
  return sentence ? { sentence, openedAt: data.opened_at } : null;
};
