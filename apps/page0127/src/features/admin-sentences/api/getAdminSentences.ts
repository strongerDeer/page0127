import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

export type AdminSentence = {
  id: string;
  text: string;
  book_title: string;
  author: string | null;
  translator: string | null;
  page: number | null;
  isbn: string | null;
  rights_note: string | null;
  is_active: boolean;
  created_at: string;
  /** 지금까지 뽑힌 횟수 — 1 이상이면 지울 수 없고 비활성만 된다 */
  draw_count: number;
};

/** 어드민 문장 풀 전체 — 최근에 넣은 것부터. 실패하면 null */
export async function getAdminSentences(): Promise<AdminSentence[] | null> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('daily_sentences')
    .select(
      'id, text, book_title, author, translator, page, isbn, rights_note, is_active, created_at, sentence_draws(count)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin] 오늘의 문장 목록 조회 실패:', error.message);
    return null;
  }

  return (data ?? []).map(({ sentence_draws, ...row }) => ({
    ...row,
    draw_count: (sentence_draws as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}
