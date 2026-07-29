/**
 * 배포된 코드가 기대하는 DB 스키마 버전.
 *
 * 왜 상수로 박는가:
 *   서버리스 번들에는 supabase/migrations/ 폴더가 들어가지 않는다. 런타임에 파일을
 *   읽을 수 없으므로 빌드에 값을 박아야 한다. 손으로 관리하는 값이라 잊기 쉬운데,
 *   같은 폴더의 schemaVersion.test.ts 가 실제 마이그레이션 파일 목록과 대조해
 *   어긋나면 CI 에서 실패시킨다. 즉 **마이그레이션을 추가하고 이 값을 안 올리면
 *   테스트가 잡는다.**
 *
 * 마이그레이션을 추가했다면:
 *   이 값을 새 파일의 앞 14자리 번호로 바꾼다. (예: 20260729000000)
 */
export const EXPECTED_MIGRATION_VERSION = '20260729000001';

/**
 * 스키마 대조 결과.
 * - ok      DB가 코드가 기대하는 버전 이상이다
 * - drift   **DB가 뒤처졌다** — 배포된 코드가 없는 컬럼·테이블을 쓴다
 * - unknown 버전을 읽지 못했다(권한·네트워크·함수 부재)
 */
export type SchemaCheck = 'ok' | 'drift' | 'unknown';

/**
 * 기대 버전과 DB에 적용된 버전을 견준다.
 *
 * DB가 앞선 것은 정상이다. 배포 순서가 "마이그레이션 먼저, 코드 나중"이라
 * 그 사이에는 항상 DB가 앞선다. 반대로 **코드가 앞선 것만 장애**다 —
 * 그때 코드는 DB에 없는 것을 쓴다.
 *
 * 번호는 고정 자릿수 타임스탬프(YYYYMMDDHHMMSS)라 문자열 비교가 곧 크기 비교다.
 */
export const compareSchemaVersion = (
  expected: string,
  applied: string | null | undefined
): SchemaCheck => {
  if (!applied) return 'unknown';

  return applied >= expected ? 'ok' : 'drift';
};
