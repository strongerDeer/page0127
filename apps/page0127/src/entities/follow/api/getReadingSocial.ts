import { parseReadingSocial } from '../model/readingSocial';

import type { SupabaseClient } from '@supabase/supabase-js';

export const getReadingSocial = async (
  client: SupabaseClient,
  currentUserId: string
) => {
  const { data, error } = await client.rpc('get_following_reading_social');
  if (error)
    throw new Error('장르와 취향을 불러오지 못했어요.', { cause: error });
  return parseReadingSocial(data, currentUserId);
};
