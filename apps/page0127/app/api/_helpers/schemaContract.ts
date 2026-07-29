/**
 * 앱 코드가 "있다고 가정하는" 스키마 목록.
 *
 * 왜 필요한가 (2026-07-29 사고):
 * 트랙 F 코드는 배포됐는데 운영 DB에 마이그레이션이 안 올라가서, `books.is_life_book`
 * 을 읽는 조회가 전부 42703(column does not exist)으로 죽었다. **그런데 모든 페이지가
 * HTTP 200 이었다** — 앱이 조회 실패를 삼키고 렌더를 계속하기 때문이다.
 * `/api/health` 도 `profiles` 만 봤으니 정상으로 떴다.
 *
 * "DB에 닿는가" 와 "배포된 코드가 기대하는 스키마가 거기 있는가" 는 다른 질문이다.
 * 이 파일이 두 번째 질문을 담당한다.
 *
 * ⚠️ 마이그레이션으로 컬럼을 추가하고 그 컬럼을 코드가 읽기 시작하면 여기에 한 줄 넣는다.
 *    넣지 않으면 같은 사고가 조용히 반복된다.
 */

/** 한 줄이 하나의 "이 컬럼이 없으면 그 화면은 죽는다" 를 뜻한다. */
export type SchemaProbe = {
  table: string;
  /** 존재를 확인할 컬럼들. select 로 한 번에 확인한다 */
  columns: string[];
  /** 이게 없으면 무엇이 깨지는지 — 실패 로그에 그대로 나간다 */
  breaks: string;
};

export const SCHEMA_CONTRACT: SchemaProbe[] = [
  {
    table: 'books',
    columns: ['is_life_book', 'rating', 'is_public', 'read_count'],
    breaks: '책장·완독 목록·공개 서재 — 2026-07-29 사고가 난 자리',
  },
  {
    table: 'profiles',
    columns: ['username', 'nickname'],
    breaks: '로그인 후 모든 화면 (사용자 식별)',
  },
  {
    table: 'user_daily_visits',
    // visit_date 다 — visited_on 이 아니다. 마이그레이션을 열어 확인했다.
    // 컬럼명을 기억으로 적으면 이 검사 자체가 오탐을 낸다(실제로 한 번 냈다).
    columns: ['visit_date', 'first_visit_at'],
    breaks: '재방문 계측 적재 (트랙 D-1)',
  },
];

/** PostgREST 가 "컬럼 없음" 으로 주는 코드. 다른 실패와 구분해야 원인이 드러난다. */
export const UNDEFINED_COLUMN = '42703';
/** 테이블 자체가 없을 때 */
export const UNDEFINED_TABLE = '42P01';

export type ProbeFailure = {
  table: string;
  code: string | null;
  message: string;
  breaks: string;
};

/**
 * 스키마 계약을 확인한다. 조회 결과(행)는 보지 않는다 — **에러 코드만** 본다.
 * RLS 로 막혀 0건이 와도 컬럼이 있으면 에러가 없으므로 통과한다.
 */
export async function checkSchemaContract(
  query: (table: string, columns: string[]) => Promise<{ code?: string; message?: string } | null>
): Promise<ProbeFailure[]> {
  const failures: ProbeFailure[] = [];

  for (const probe of SCHEMA_CONTRACT) {
    const error = await query(probe.table, probe.columns);
    if (!error) continue;

    // 스키마 이상(컬럼·테이블 없음)만 계약 위반으로 본다.
    // 연결 끊김이나 일시적 오류는 database 체크가 따로 잡는다.
    const code = error.code ?? null;
    if (code === UNDEFINED_COLUMN || code === UNDEFINED_TABLE) {
      failures.push({
        table: probe.table,
        code,
        message: error.message ?? '',
        breaks: probe.breaks,
      });
    }
  }

  return failures;
}
