import { apiClient } from '@/shared/api/client';

import { getSeoulToday } from '@/entities/book/model/libraryPeriod';

import type {
  EnvelopeReply,
  ReadingEnvelopeKind,
  ReadingEnvelopeResponse,
} from '../model/readingNudge';
import type { SupabaseClient } from '@supabase/supabase-js';

export const getNudgeSentRecipients = async (
  client: SupabaseClient,
  currentUserId: string,
  day = getSeoulToday()
): Promise<string[]> => {
  const { data, error } = await client
    .from('reading_nudge_limits')
    .select('user_id')
    .eq('actor_id', currentUserId)
    .eq('sent_day', day);
  if (error)
    throw new Error('콕 찌르기 기록을 확인하지 못했어요. 다시 눌러 주세요.');
  return (data ?? []).map((row) => row.user_id);
};
export const getNudgeRecipients = async (
  client: SupabaseClient
): Promise<string[]> => {
  const { data, error } = await client.rpc('get_reading_nudge_recipients');
  if (error) throw new Error('맞팔 여부를 확인하지 못했어요.');
  return (data ?? []).map((row: { user_id: string }) => row.user_id);
};
export type SendEnvelopeInput = {
  kind: ReadingEnvelopeKind;
  message: string;
  bookIsbn: string | null;
};
export const sendReadingNudge = async (
  recipientId: string,
  input: SendEnvelopeInput
) => {
  const { data } = await apiClient.post<{ id: string }>('/reading-nudges', {
    recipientId,
    ...input,
  });
  return data.id;
};
export const respondReadingEnvelope = async (
  id: string,
  input: EnvelopeReply
) => {
  const { data } = await apiClient.post<ReadingEnvelopeResponse>(
    `/reading-nudges/${id}/respond`,
    input
  );
  return data;
};
export type NudgePreference = { enabled: boolean; push_enabled: boolean };
export const getNudgePreference = async (
  client: SupabaseClient,
  userId: string
): Promise<NudgePreference> => {
  const { data, error } = await client
    .from('reading_nudge_settings')
    .select('enabled,push_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('메시지 수신 설정을 불러오지 못했어요.');
  return {
    enabled: data?.enabled ?? true,
    push_enabled: data?.push_enabled ?? false,
  };
};
export const setNudgePreference = async (
  client: SupabaseClient,
  userId: string,
  preference: NudgePreference
) => {
  const { error } = await client
    .from('reading_nudge_settings')
    .upsert({ user_id: userId, ...preference });
  if (error) throw new Error('메시지 수신 설정을 저장하지 못했어요.');
};
