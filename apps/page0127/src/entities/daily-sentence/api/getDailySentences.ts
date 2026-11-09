import type { DailySentence } from '../model/types';
import type { SupabaseClient } from '@supabase/supabase-js';

type DrawRow = {
  draw_date: string;
  sentence: Omit<DailySentence, 'draw_date' | 'sentence_id'> & { id: string };
};

const toDailySentence = ({ draw_date, sentence }: DrawRow): DailySentence => ({
  draw_date,
  sentence_id: sentence.id,
  text: sentence.text,
  book_title: sentence.book_title,
  author: sentence.author,
  translator: sentence.translator,
  page: sentence.page,
  isbn: sentence.isbn,
});

/**
 * 내가 뽑은 오늘의 문장 전부 — 서재 카드(오늘 것)와 캘린더 북마크(나머지)가 같이 쓴다.
 *
 * 하루 한 줄이라 1년에 많아야 365줄이다. 달마다 다시 부르지 않고 한 번에 내려준다.
 * RLS 가 내 기록·내가 뽑은 문장만 열어 준다. 실패하면 빈 배열 — 곁들이는 칸이라 서재를 막지 않는다.
 *
 * 클라이언트를 인자로 받는 이유: next/headers 를 끌어오지 않아 index 를 어디서든 import 할 수 있게.
 */
export const getDailySentences = async (
  client: SupabaseClient,
  userId: string
): Promise<DailySentence[]> => {
  const { data, error } = await client
    .from('sentence_draws')
    .select(
      'draw_date, sentence:daily_sentences!inner(id, text, book_title, author, translator, page, isbn)'
    )
    .eq('user_id', userId)
    .order('draw_date', { ascending: false })
    .returns<DrawRow[]>();

  if (error) {
    console.error('오늘의 문장 기록 조회 실패:', error.message);
    return [];
  }

  return (data ?? []).map(toDailySentence);
};

/** 펼칠 문장이 하나라도 있는가 — 없으면 서재에 진입점을 그리지 않는다 */
export const hasDailySentences = async (
  client: SupabaseClient
): Promise<boolean> => {
  const { data, error } = await client.rpc('has_daily_sentences');
  if (error) {
    console.error('오늘의 문장 풀 확인 실패:', error.message);
    return false;
  }
  return data === true;
};
