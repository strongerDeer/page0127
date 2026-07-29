import { NextResponse } from 'next/server';

import {
  compareSchemaVersion,
  EXPECTED_MIGRATION_VERSION,
} from '@/shared/config/schemaVersion';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';

import type { SchemaCheck } from '@/shared/config/schemaVersion';

/**
 * GET /api/health
 * 운영 상태 확인용 헬스체크 엔드포인트 (외부 uptime 모니터가 주기적으로 호출).
 *
 * 학습 포인트:
 * - 인증 없이 접근 가능해야 한다 (모니터는 쿠키/토큰이 없음).
 * - 앱이 살아있는지(프로세스) + DB에 닿는지(의존성)를 한 번에 본다.
 * - DB가 죽으면 503을 반환해 모니터가 "장애"로 감지하게 한다.
 *
 * 2026-07-29 에 검사를 하나 더 붙였다 — **스키마가 배포된 코드와 맞는가.**
 * 그날 트랙 F 코드는 배포됐는데 운영 DB에 마이그레이션이 안 올라가서
 * books.is_life_book 조회가 전부 42703 으로 죽었는데도 이 엔드포인트는
 * 계속 200 이었다. profiles 한 건만 조회해 "DB에 닿는가"만 봤기 때문이다.
 * **닿는 것과 맞는 것은 다른 문제다.**
 */

// 정적 캐시되지 않고 매 요청마다 실제로 실행되도록 강제한다.
// (헬스체크가 캐시된 옛 결과를 반환하면 장애를 놓친다)
export const dynamic = 'force-dynamic';

/**
 * DB에 적용된 마이그레이션 번호를 읽어 기대 버전과 견준다.
 *
 * 읽기 자체가 실패하면 'unknown' 이다. 이때 서비스를 장애(503)로 만들지는
 * 않는다 — **감지 장치가 고장난 것과 서비스가 고장난 것은 다르다.** 대신
 * uptime 워크플로가 본문에서 `"schema":"ok"` 를 요구하므로 알림은 간다.
 */
const checkSchema = async (): Promise<SchemaCheck> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('applied_migration_version');

    if (error) {
      console.error('스키마 버전 조회 실패:', error.message);
      return 'unknown';
    }

    return compareSchemaVersion(
      EXPECTED_MIGRATION_VERSION,
      data as string | null
    );
  } catch (error) {
    // service_role 키가 없는 환경(로컬·프리뷰)에서는 여기로 온다
    console.error(
      '스키마 버전 조회 불가:',
      error instanceof Error ? error.message : error
    );
    return 'unknown';
  }
};

export async function GET() {
  const timestamp = new Date().toISOString();

  // 가장 가벼운 DB 연결 확인:
  // profiles에서 id 한 건만 조회한다. DB가 죽으면 error가 나고,
  // RLS로 막혀도 빈 배열만 올 뿐 error는 나지 않으므로 "연결 여부"만 판별된다.
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // DB에 닿았지만 쿼리가 실패 → 의존성 이상.
      // 닿지도 못하는 마당에 스키마를 물어볼 필요는 없다.
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: { database: 'down', schema: 'unknown' },
        },
        { status: 503 }
      );
    }

    const schema = await checkSchema();

    // 코드가 DB보다 앞섰다 = 없는 컬럼·테이블을 쓰고 있다. 실제 장애다.
    if (schema === 'drift') {
      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: { database: 'ok', schema: 'drift' },
          expectedMigration: EXPECTED_MIGRATION_VERSION,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      timestamp,
      checks: { database: 'ok', schema },
    });
  } catch {
    // 클라이언트 생성/네트워크 자체가 실패 → 완전 장애
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp,
        checks: { database: 'down', schema: 'unknown' },
      },
      { status: 503 }
    );
  }
}
