import { NextResponse } from 'next/server';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { toKstDateKey } from '@/shared/lib/date';

import { getCurrentUser } from '../_helpers/auth';

/**
 * POST /api/visit — 로그인 사용자의 "오늘 왔다" 기록.
 *
 * 왜 Supabase 직접 insert가 아니라 라우트 핸들러인가:
 *   anon 키로 직접 넣게 하려면 테이블에 INSERT 정책을 열어야 하는데, 그러면 누구나
 *   남의 user_id로 방문 기록을 심을 수 있다. 여기서 service_role로 대신 쓰면 테이블은
 *   계속 전면 거부(RLS on + 정책 없음)로 둘 수 있고, **누구인지를 서버가 세션에서
 *   직접 읽는다.**
 *
 * 왜 UA 봇 판정이 없는가(/api/rum과 다른 점):
 *   저장 조건이 "로그인 세션이 있을 것"이라 크롤러는 애초에 통과하지 못한다. 걸러야
 *   할 대상은 로그인해서 도는 e2e 테스트이고, 그건 클라이언트(VisitReporter)가 막는다.
 *
 * 판단 근거: docs/superpowers/specs/2026-07-28-visit-log-and-rating-split-design.md
 */

// 매 방문 발사된다 — 캐시되면 안 되고, 정적 최적화 대상도 아니다.
export const dynamic = 'force-dynamic';

export async function POST() {
  const { user } = await getCurrentUser();

  // 비로그인은 오류가 아니다. 로그아웃 직후 발사된 요청이 정상 경로다.
  if (!user) return new NextResponse(null, { status: 204 });

  // 이미 그날 행이 있으면 아무것도 하지 않는다 → first_visit_at 이 그날 첫 방문
  // 시각으로 유지된다(덮어쓰면 마지막 방문 시각이 되어 뜻이 달라진다).
  const { error } = await createAdminClient()
    .from('user_daily_visits')
    .upsert(
      { user_id: user.id, visit_date: toKstDateKey(new Date()) },
      { onConflict: 'user_id,visit_date', ignoreDuplicates: true }
    );

  if (error) {
    // 수집 실패가 사용자 경험에 영향을 주면 안 된다 — 로그만 남기고 204로 끝낸다.
    console.error('[visit] 방문 기록 저장 실패:', error.message);
  }

  return new NextResponse(null, { status: 204 });
}
