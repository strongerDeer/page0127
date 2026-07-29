import { NextResponse } from 'next/server';

import { createClient } from '@/shared/config/supabase/server';

import { checkSchemaContract } from '../_helpers/schemaContract';

/**
 * GET /api/health
 * 운영 상태 확인용 헬스체크 엔드포인트 (외부 uptime 모니터가 주기적으로 호출).
 *
 * 학습 포인트:
 * - 인증 없이 접근 가능해야 한다 (모니터는 쿠키/토큰이 없음).
 * - 앱이 살아있는지(프로세스) + DB에 닿는지(의존성)를 한 번에 본다.
 * - DB가 죽으면 503을 반환해 모니터가 "장애"로 감지하게 한다.
 *
 * 2026-07-29 에 확인 하나가 늘었다 — **스키마 계약**.
 * "DB에 닿는가" 만 보면 부족하다. 그날 트랙 F 코드는 배포됐는데 운영에
 * 마이그레이션이 안 올라가서 books.is_life_book 조회가 전부 42703 으로 죽었다.
 * profiles 는 멀쩡했으니 이 엔드포인트는 정상으로 떴고, 앱은 조회 실패를
 * 삼키고 렌더를 계속해 모든 페이지가 HTTP 200 이었다. 사흘 뒤 운영 DB에
 * 직접 쿼리를 던져보고서야 발견했다.
 */

// 정적 캐시되지 않고 매 요청마다 실제로 실행되도록 강제한다.
// (헬스체크가 캐시된 옛 결과를 반환하면 장애를 놓친다)
export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();

    // ① 연결 확인 — profiles에서 id 한 건.
    // RLS로 막혀도 빈 배열만 올 뿐 error는 나지 않으므로 "연결 여부"만 판별된다.
    const { error: connError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (connError) {
      return NextResponse.json(
        { status: 'degraded', timestamp, checks: { database: 'down' } },
        { status: 503 }
      );
    }

    // ② 스키마 계약 — 배포된 코드가 기대하는 컬럼이 실제로 있는가.
    // 행을 보지 않고 에러 코드만 본다. RLS로 0건이 와도 컬럼이 있으면 통과한다.
    const schemaFailures = await checkSchemaContract(async (table, columns) => {
      const { error } = await supabase
        .from(table)
        .select(columns.join(','))
        .limit(1);
      return error ? { code: error.code, message: error.message } : null;
    });

    if (schemaFailures.length > 0) {
      // 사람이 로그만 보고 원인을 알 수 있게 무엇이 깨지는지까지 적는다.
      for (const f of schemaFailures) {
        console.error(
          `[health] 스키마 계약 위반: ${f.table} (${f.code}) — ${f.breaks} :: ${f.message}`
        );
      }
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: { database: 'ok', schema: 'drift' },
          // 모니터 로그에 그대로 남아야 새벽에도 원인을 안다
          drift: schemaFailures.map((f) => ({
            table: f.table,
            code: f.code,
            breaks: f.breaks,
          })),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp,
      checks: { database: 'ok', schema: 'ok' },
    });
  } catch {
    // 클라이언트 생성/네트워크 자체가 실패 → 완전 장애
    return NextResponse.json(
      { status: 'degraded', timestamp, checks: { database: 'down' } },
      { status: 503 }
    );
  }
}
