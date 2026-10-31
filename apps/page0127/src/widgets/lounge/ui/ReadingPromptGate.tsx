import { createClient } from '@/shared/config/supabase/server';

import { ReadingPrompt } from './ReadingPrompt';

/**
 * 읽는 중인 책이 한 권도 없을 때만 '읽는 중 등록' 안내를 보여준다.
 * 이미 읽는 중인 책이 있는데 "다음 한 권, 이미 시작했나요?"를 묻는 건 어색하다.
 * 조회에 실패하면 안내를 숨긴다 — 잘못 띄우는 쪽보다 안 띄우는 쪽이 덜 거슬린다.
 */
export const ReadingPromptGate = async ({ userId }: { userId: string }) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'reading');

  if (error || count === null || count > 0) return null;
  return <ReadingPrompt />;
};
