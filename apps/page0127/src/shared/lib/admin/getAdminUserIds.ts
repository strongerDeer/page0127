import { createAdminClient } from '@/shared/config/supabase/admin';

import { getAdminEmails } from './config';

/**
 * 지표에서 뺄 계정의 user id — 관리자 + 리뷰어용 체험 계정 + 운영자 테스트 계정.
 * 방문·재방문·가입·책 지표와 회원 관리의 "실제 회원 수"에서 뺀다.
 *
 * 왜 빼는가: 사용자가 수십 명일 때 운영자가 매일 들어오는 1명이 DAU·재방문율을 크게
 * 끌어올린다(10명 중 1명 = 10%p). GA 쪽은 MarkAdminDevice 로 이미 빼고 있어,
 * 여기서도 빼야 두 화면의 "방문자"가 같은 사람들을 센다.
 * 체험 계정(profiles.is_demo)은 여러 리뷰어가 함께 쓰는 공용 계정이라 진짜 회원이 아니다.
 * 테스트 계정(profiles.is_test)은 운영자가 다른 이메일로 만든 계정이라 ADMIN_EMAILS 에 없다 —
 * 어드민 회원 상세의 토글로 표시한다(20261124000000).
 *
 * 실패하면 빈 배열 — 지표가 조금 부풀 뿐 화면이 죽을 일은 아니다. 로그는 남긴다.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const emails = getAdminEmails();

  const [admins, flagged] = await Promise.all([
    emails.length > 0
      ? admin.from('profiles').select('id').in('email', emails)
      : Promise.resolve({ data: [], error: null }),
    // 체험·테스트 계정을 한 번에 — PostgREST or 필터(is_demo = true OR is_test = true)
    admin.from('profiles').select('id').or('is_demo.eq.true,is_test.eq.true'),
  ]);

  for (const { error } of [admins, flagged]) {
    if (error)
      console.error('[admin] 지표 제외 계정 조회 실패:', error.message);
  }
  // 운영자 계정에 테스트 표시까지 켜 두면 두 번 나온다 — 개수를 셀 때 겹치지 않게 Set 으로 거른다
  return [
    ...new Set(
      [...(admins.data ?? []), ...(flagged.data ?? [])].map(
        (r) => r.id as string
      )
    ),
  ];
}

/** PostgREST `not in` 필터 값 — `.not('user_id', 'in', toInFilter(ids))` */
export const toInFilter = (ids: string[]): string => `(${ids.join(',')})`;
