import { getSeoulToday } from '@/entities/book/model/libraryPeriod';

import type { NudgeBook, ReadingNudgeMessage } from '../model/readingNudge';
import type { SupabaseClient } from '@supabase/supabase-js';

export const getNudgeComposer = async (
  client: SupabaseClient,
  currentUserId: string,
  recipientId: string
) => {
  const [books, sent] = await Promise.all([
    client
      .from('books')
      .select('id,title')
      .eq('user_id', currentUserId)
      .eq('is_public', true)
      .in('status', ['reading', 'completed'])
      .order('created_at', { ascending: false })
      .limit(100),
    client
      .from('reading_nudge_limits')
      .select('user_id')
      .eq('actor_id', currentUserId)
      .eq('user_id', recipientId)
      .eq('sent_day', getSeoulToday()),
  ]);
  if (books.error || sent.error)
    throw new Error('콕 찌르기를 준비하지 못했어요. 다시 시도해 주세요.');
  return {
    books: (books.data ?? []) as NudgeBook[],
    sent: (sent.data?.length ?? 0) > 0,
  };
};
export const sendReadingNudge = async (
  client: SupabaseClient,
  recipientId: string,
  message: ReadingNudgeMessage,
  bookId: string | null
) => {
  const { data, error } = await client.rpc('send_reading_nudge', {
    p_user_id: recipientId,
    p_message: message,
    p_book_id: bookId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string')
    throw new Error(
      '전송 결과를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.'
    );
  return data;
};
export const getNudgePreference = async (
  client: SupabaseClient,
  userId: string
) => {
  const { data, error } = await client
    .from('reading_nudge_settings')
    .select('enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('콕 찌르기 수신 설정을 불러오지 못했어요.');
  return data?.enabled ?? true;
};
export const setNudgePreference = async (
  client: SupabaseClient,
  userId: string,
  enabled: boolean
) => {
  const { error } = await client
    .from('reading_nudge_settings')
    .upsert({ user_id: userId, enabled });
  if (error) throw new Error('콕 찌르기 수신 설정을 저장하지 못했어요.');
};
