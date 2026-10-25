import { cache } from 'react';

import { createClient } from '@/shared/config/supabase/server';

import type { BadgeActivity } from '../model/badges';

/** RLS 원본을 열지 않고, 배지에 필요한 공개 근거만 조회한다. */
export const getBadgeActivity = cache(
  async (userId: string): Promise<BadgeActivity | undefined> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_public_badge_activity', {
      p_user_id: userId,
    });
    if (error) {
      console.error('배지 활동 조회 실패:', error.message);
      return undefined;
    }
    return (data as BadgeActivity | null) ?? undefined;
  }
);
