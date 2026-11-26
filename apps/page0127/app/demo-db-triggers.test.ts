import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: 체험 계정 데모(20261121000100) 이후 새로 만든 public 표가
 * DB 차단 트리거(zz_block_demo_writes)를 달았는지, 아니면 이유와 함께 빠졌는지 검사한다.
 *
 * 왜 필요한가:
 * 트리거는 "그때 있던 표 목록"에만 걸렸다. 그 뒤 생긴 typing_records(필사 기록)가 목록에서 빠져
 * 체험 계정 토큰으로 함수를 직접 부르면 기록이 쌓였다(2026-11-26 발견).
 * 표를 새로 만들면서 트리거를 잊어도 아무 에러가 안 난다 — 이 테스트가 CI 에서 잡는다.
 */

const MIGRATIONS_DIR = fileURLToPath(
  new URL('../../../supabase/migrations', import.meta.url)
);

/** 체험 계정 차단을 처음 만든 마이그레이션 — 이 뒤에 만든 표만 본다 */
const DEMO_MIGRATION = '20261121000100';

/** 트리거 없이 두는 표 — 사용자가 직접 쓰는 기록이 아닌 것만, 이유와 함께 */
const ALLOWED: Record<string, string> = {
  stories: '책 이야기 글 — 어드민(service_role)만 쓴다',
  admin_seen_marks: '어드민 확인 표시 — 어드민만 쓴다',
  signup_attributions:
    '가입 경로 — 가입 때 서버가 쓴다(체험 계정은 가입하지 않는다)',
  typing_guest_scores:
    '비회원 필사 점수 — 서버(service_role)만 쓰고 로그인 사용자와 무관',
};

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const read = (name: string) => readFileSync(join(MIGRATIONS_DIR, name), 'utf8');

/** DEMO_MIGRATION 이후 새로 만든 public 표 이름 */
const createdAfterDemo = (): string[] => {
  const tables = new Set<string>();
  for (const name of migrations) {
    if (name.slice(0, 14) <= DEMO_MIGRATION) continue;
    const sql = read(name);
    for (const match of sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi
    )) {
      tables.add(match[1].toLowerCase());
    }
  }
  return [...tables];
};

/** zz_block_demo_writes 를 거는 마이그레이션의 표 목록(array[...] 안의 이름) */
const triggeredTables = (): Set<string> => {
  const tables = new Set<string>();
  for (const name of migrations) {
    const sql = read(name);
    if (!sql.includes('zz_block_demo_writes')) continue;
    for (const block of sql.matchAll(/array\s*\[([^\]]*)\]/gi)) {
      for (const item of block[1].matchAll(/'([a-z_][a-z0-9_]*)'/gi)) {
        tables.add(item[1].toLowerCase());
      }
    }
  }
  return tables;
};

describe('체험 계정 DB 차단 트리거', () => {
  it('데모 이후 만든 public 표는 트리거를 달거나 ALLOWED 에 이유가 있다', () => {
    const triggered = triggeredTables();
    const missing = createdAfterDemo().filter(
      (table) => !triggered.has(table) && !(table in ALLOWED)
    );
    // 실패하면: 사용자 기록 표면 zz_block_demo_writes 트리거를 붙이고,
    // 아니면 ALLOWED 에 왜 괜찮은지 적는다
    expect(missing).toEqual([]);
  });

  it('필사 기록·독서 목표에 트리거가 걸려 있다', () => {
    const triggered = triggeredTables();
    expect(triggered.has('typing_records')).toBe(true);
    expect(triggered.has('reading_goals')).toBe(true);
  });

  it('ALLOWED 에 없는 표 이름이 남아 있지 않다(지운 표 정리)', () => {
    const created = new Set(createdAfterDemo());
    expect(Object.keys(ALLOWED).filter((t) => !created.has(t))).toEqual([]);
  });
});
