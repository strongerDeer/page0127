import { createAnonClient } from '@/shared/config/supabase/anon';

import {
  type AboutStats,
  type AboutStatsRow,
  toAboutStats,
} from '../model/aboutStats';

import 'server-only';

/** 소개 페이지 숫자 세 개 — 실패하면 null 이고, 섹션만 사라진다 */
export const getAboutStats = async (): Promise<AboutStats | null> => {
  const { data, error } = await createAnonClient().rpc('get_about_stats');
  const stats = error
    ? null
    : toAboutStats((data as AboutStatsRow[] | null)?.[0]);
  if (!stats) {
    console.error('[about] 통계 조회 실패:', error?.message ?? '빈 결과');
  }
  return stats;
};
