import { NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

/**
 * GET /api/health
 * 운영 상태 확인용 헬스체크 엔드포인트 (외부 uptime 모니터가 주기적으로 호출).
 *
 * 학습 포인트:
 * - 인증 없이 접근 가능해야 한다 (모니터는 쿠키/토큰이 없음).
 * - 앱이 살아있는지(프로세스) + DB에 닿는지(의존성)를 한 번에 본다.
 * - DB가 죽으면 503을 반환해 모니터가 "장애"로 감지하게 한다.
 */

// 정적 캐시되지 않고 매 요청마다 실제로 실행되도록 강제한다.
// (헬스체크가 캐시된 옛 결과를 반환하면 장애를 놓친다)
export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  // 가장 가벼운 DB 연결 확인:
  // profiles에서 id 한 건만 조회한다. DB가 죽으면 error가 나고,
  // RLS로 막혀도 빈 배열만 올 뿐 error는 나지 않으므로 "연결 여부"만 판별된다.
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // DB에 닿았지만 쿼리가 실패 → 의존성 이상
      return NextResponse.json(
        { status: 'degraded', timestamp, checks: { database: 'down' } },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp,
      checks: { database: 'ok' },
    });
  } catch {
    // 클라이언트 생성/네트워크 자체가 실패 → 완전 장애
    return NextResponse.json(
      { status: 'degraded', timestamp, checks: { database: 'down' } },
      { status: 503 }
    );
  }
}
