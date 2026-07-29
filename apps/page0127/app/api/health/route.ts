import { NextResponse } from 'next/server';

import {
  compareSchemaVersion,
  EXPECTED_MIGRATION_VERSION,
} from '@/shared/config/schemaVersion';
import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';

import { checkSchemaContract } from '../_helpers/schemaContract';

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
 *
 * 스키마 검사는 서로 다른 눈 두 개를 쓴다. 하나가 못 보는 것을 다른 하나가 본다:
 *
 *   ① 계약(contract) — 앱이 읽는 컬럼이 실제로 있는가.
 *      깨지면 "어느 화면이 죽는지"까지 알려준다. 대신 목록에 적어둔 컬럼만 본다.
 *   ② 버전(migration) — 적용된 마이그레이션이 배포된 코드만큼 올라왔는가.
 *      목록 관리가 필요 없고 함수·정책·인덱스처럼 컬럼 아닌 변경도 잡는다.
 *      대신 "무엇이 깨지는지"는 모른다.
 *
 * 둘 중 하나라도 어긋나면 schema 는 'drift' 다.
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
const checkMigrationVersion = async (): Promise<SchemaCheck> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('applied_migration_version');

    if (error) {
      console.error('[health] 스키마 버전 조회 실패:', error.message);
      return 'unknown';
    }

    return compareSchemaVersion(
      EXPECTED_MIGRATION_VERSION,
      data as string | null
    );
  } catch (error) {
    // service_role 키가 없는 환경(로컬·프리뷰)에서는 여기로 온다
    console.error(
      '[health] 스키마 버전 조회 불가:',
      error instanceof Error ? error.message : error
    );
    return 'unknown';
  }
};

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

    // ② 스키마 계약 — 배포된 코드가 기대하는 컬럼이 실제로 있는가.
    // 행을 보지 않고 에러 코드만 본다. RLS로 0건이 와도 컬럼이 있으면 통과한다.
    const contractFailures = await checkSchemaContract(
      async (table, columns) => {
        const { error } = await supabase
          .from(table)
          .select(columns.join(','))
          .limit(1);
        return error ? { code: error.code, message: error.message } : null;
      }
    );

    // ③ 마이그레이션 버전 — 계약 목록이 놓치는 변경(함수·정책·인덱스)까지 본다.
    const migration = await checkMigrationVersion();

    if (contractFailures.length > 0 || migration === 'drift') {
      // 사람이 로그만 보고 원인을 알 수 있게 무엇이 깨지는지까지 적는다.
      for (const failure of contractFailures) {
        console.error(
          `[health] 스키마 계약 위반: ${failure.table} (${failure.code}) — ${failure.breaks} :: ${failure.message}`
        );
      }
      if (migration === 'drift') {
        console.error(
          `[health] 마이그레이션 미적용: 코드는 ${EXPECTED_MIGRATION_VERSION} 을 기대한다`
        );
      }

      return NextResponse.json(
        {
          status: 'degraded',
          timestamp,
          checks: { database: 'ok', schema: 'drift' },
          // 모니터 로그에 그대로 남아야 새벽에도 원인을 안다
          drift: contractFailures.map((failure) => ({
            table: failure.table,
            code: failure.code,
            breaks: failure.breaks,
          })),
          migration,
          expectedMigration: EXPECTED_MIGRATION_VERSION,
        },
        { status: 503 }
      );
    }

    // 계약은 통과했는데 버전을 못 읽었다면 감지 장치 절반이 눈을 감은 것이다.
    // 서비스 자체는 정상이므로 200 을 유지하되, uptime 의 EXPECT 가 걸러낸다.
    return NextResponse.json({
      status: 'ok',
      timestamp,
      checks: {
        database: 'ok',
        schema: migration === 'unknown' ? 'unknown' : 'ok',
      },
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
