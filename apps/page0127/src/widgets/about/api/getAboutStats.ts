import { createAnonClient } from '@/shared/config/supabase/anon';

import {
  type AboutStats,
  type AboutStatsRow,
  toAboutStats,
} from '../model/aboutStats';
import { cacheAbout } from './aboutCache';

import 'server-only';

/**
 * 소개 페이지 숫자 세 개 (1시간 캐시).
 * get_about_stats 는 books·ai_usage_logs 를 전수 COUNT 한다 — 방문마다 돌리면 안 된다.
 */
const loadAboutStats = async (): Promise<AboutStats | null> => {
  const { data, error } = await createAnonClient().rpc('get_about_stats');
  if (error) throw new Error(error.message);
  const stats = toAboutStats((data as AboutStatsRow[] | null)?.[0]);
  // 빈 결과도 실패로 친다 — 캐시하지 않고 다음 요청에서 다시 묻는다
  if (!stats) throw new Error('빈 결과');
  return stats;
};

/** 실패하면 null — 숫자 섹션만 사라진다 */
export const getAboutStats = cacheAbout('stats', loadAboutStats, null);
