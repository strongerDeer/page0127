import { describe, expect, it } from 'vitest';

import {
  checkSchemaContract,
  SCHEMA_CONTRACT,
  UNDEFINED_COLUMN,
  UNDEFINED_TABLE,
  UNDEFINED_TABLE_POSTGREST,
} from './schemaContract';

/**
 * 2026-07-29 사고의 재발 방지 장치를 검사한다.
 *
 * 그날 실패한 것은 "감시가 없었다" 가 아니라 **감시가 엉뚱한 걸 봤다** 는 쪽이다.
 * /api/health 는 profiles 만 확인해 정상이었고, 정작 죽은 books.is_life_book 은
 * 아무도 안 봤다. 그래서 여기서는 "42703 을 실제로 잡는가" 를 검사한다.
 */

describe('스키마 계약', () => {
  it('사고가 난 컬럼(books.is_life_book)이 계약에 들어 있다', () => {
    const books = SCHEMA_CONTRACT.find((p) => p.table === 'books');
    expect(books).toBeDefined();
    expect(books?.columns).toContain('is_life_book');
  });

  it('모든 항목이 무엇이 깨지는지 적어 뒀다 — 새벽에 로그만 보고 판단해야 한다', () => {
    const missing = SCHEMA_CONTRACT.filter((p) => !p.breaks.trim());
    expect(missing).toEqual([]);
  });

  it('전부 정상이면 위반이 없다', async () => {
    const failures = await checkSchemaContract(async () => null);
    expect(failures).toEqual([]);
  });

  it('컬럼이 없으면(42703) 잡는다 — 이게 사고 당시 놓친 신호다', async () => {
    const failures = await checkSchemaContract(async (table) =>
      table === 'books'
        ? {
            code: UNDEFINED_COLUMN,
            message: 'column books.is_life_book does not exist',
          }
        : null
    );

    expect(failures).toHaveLength(1);
    expect(failures[0].table).toBe('books');
    expect(failures[0].code).toBe(UNDEFINED_COLUMN);
    // 무엇이 깨지는지가 실패 정보에 함께 실려야 한다
    expect(failures[0].breaks).toContain('책장');
  });

  it('테이블이 없으면(42P01) 도 잡는다', async () => {
    const failures = await checkSchemaContract(async (table) =>
      table === 'user_daily_visits'
        ? { code: UNDEFINED_TABLE, message: 'relation does not exist' }
        : null
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].code).toBe(UNDEFINED_TABLE);
  });

  it('테이블이 없을 때 PostgREST 가 주는 PGRST205 도 잡는다', async () => {
    // 42P01 만 보던 시절 이걸 놓쳤다. 2026-07-29 개발 DB 에 user_daily_visits 가
    // 통째로 없었는데 헬스체크는 정상으로 떴다 — PostgREST 는 스키마 캐시에
    // 테이블이 없으면 쿼리를 실행하지 않고 PGRST205 로 끊기 때문이다.
    const failures = await checkSchemaContract(async (table) =>
      table === 'user_daily_visits'
        ? {
            code: UNDEFINED_TABLE_POSTGREST,
            message:
              "Could not find the table 'public.user_daily_visits' in the schema cache",
          }
        : null
    );

    expect(failures).toHaveLength(1);
    expect(failures[0].table).toBe('user_daily_visits');
    expect(failures[0].code).toBe(UNDEFINED_TABLE_POSTGREST);
    expect(failures[0].breaks).toContain('재방문');
  });

  it('스키마와 무관한 실패(연결 끊김 등)는 계약 위반으로 보지 않는다', async () => {
    // 이걸 위반으로 세면 일시적 네트워크 문제마다 "스키마 drift" 로 오진한다.
    // 연결 이상은 health 의 database 체크가 따로 잡는다.
    const failures = await checkSchemaContract(async () => ({
      code: '57014',
      message: 'canceling statement due to statement timeout',
    }));
    expect(failures).toEqual([]);
  });

  it('여러 테이블이 동시에 깨지면 전부 보고한다 — 하나만 고치고 끝내지 않게', async () => {
    const failures = await checkSchemaContract(async (table) =>
      table === 'books' || table === 'user_daily_visits'
        ? { code: UNDEFINED_COLUMN, message: 'nope' }
        : null
    );
    expect(failures.map((f) => f.table).sort()).toEqual([
      'books',
      'user_daily_visits',
    ]);
  });
});
