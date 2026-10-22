import { createAdminClient } from '@/shared/config/supabase/admin';

import { getAdminEmails } from './config';

/**
 * 관리자 계정의 user id — 방문·재방문 지표에서 뺀다.
 *
 * 왜 빼는가: 사용자가 수십 명일 때 운영자가 매일 들어오는 1명이 DAU·재방문율을 크게
 * 끌어올린다(10명 중 1명 = 10%p). GA 쪽은 MarkAdminDevice 로 이미 빼고 있어,
 * 여기서도 빼야 두 화면의 "방문자"가 같은 사람들을 센다.
 *
 * 실패하면 빈 배열 — 지표가 조금 부풀 뿐 화면이 죽을 일은 아니다. 로그는 남긴다.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const emails = getAdminEmails();
  if (emails.length === 0) return [];

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('id')
    .in('email', emails);
  if (error) {
    console.error('[admin] 관리자 id 조회 실패:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.id as string);
}

/** PostgREST `not in` 필터 값 — `.not('user_id', 'in', toInFilter(ids))` */
export const toInFilter = (ids: string[]): string => `(${ids.join(',')})`;
