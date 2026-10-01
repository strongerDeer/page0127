import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 안전망: profiles 를 `select('*')`·`select()` 로 읽는 코드가 없는지 검사한다.
 *
 * 왜 소스를 훑는가:
 * profiles.email·status·suspended_until 은 anon·authenticated 에게 SELECT 권한이 없다
 * (20261001000000_hide_profile_email.sql). 권한 없는 컬럼이 섞이면 Postgres 가 **쿼리 전체를
 * 42501 로 거절**하는데, 앱은 조회 실패를 삼키고 렌더를 이어 가므로 화면은 200 으로 뜨고
 * 프로필만 조용히 비어 보인다. 로컬 DB 에 마이그레이션이 안 올라가 있으면 개발 중엔 멀쩡하다.
 * 그래서 값이 아니라 **select 인자 모양**만 본다. 컬럼 목록은 `PROFILE_PUBLIC_COLUMNS` 를 쓴다.
 */

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['src', 'app'];
const FROM_PROFILES = ".from('profiles')";

const collectFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
};

/**
 * `.from('profiles')` 다음에 오는 **첫 select** 의 인자가 비었거나 `'*'` 이면 위반이다.
 * 다음 `.from(` 이 먼저 나오면 그 쿼리는 select 가 없는 것(update·insert)이라 넘어간다.
 */
const findWildcardSelects = (source: string): number => {
  let violations = 0;
  let cursor = source.indexOf(FROM_PROFILES);
  while (cursor !== -1) {
    const after = cursor + FROM_PROFILES.length;
    const select = source.indexOf('.select(', after);
    const nextFrom = source.indexOf('.from(', after);
    if (select !== -1 && (nextFrom === -1 || select < nextFrom)) {
      const arg = source.slice(select + '.select('.length).trimStart();
      if (arg.startsWith(')') || arg.startsWith("'*'")) violations += 1;
    }
    cursor = source.indexOf(FROM_PROFILES, after);
  }
  return violations;
};

describe('profiles 조회의 select 인자', () => {
  const files = SCAN_DIRS.flatMap((dir) => collectFiles(join(APP_ROOT, dir)));

  it('스캔 대상에 profiles 를 읽는 파일이 실제로 잡힌다', () => {
    // 경로가 어긋나 0개를 훑고도 통과하는 상황을 막는다.
    const readers = files.filter((file) =>
      readFileSync(file, 'utf8').includes(FROM_PROFILES)
    );
    expect(readers.length).toBeGreaterThan(0);
  });

  it('판정 함수가 위반을 실제로 잡는다', () => {
    expect(findWildcardSelects(".from('profiles')\n  .select('*')")).toBe(1);
    expect(findWildcardSelects(".from('profiles').upsert(row).select()")).toBe(1);
    expect(findWildcardSelects(".from('profiles').select('id, nickname')")).toBe(0);
    // update 뒤에 다른 테이블의 select('*') 가 와도 profiles 위반으로 보지 않는다
    expect(
      findWildcardSelects(".from('profiles').update(x);\n.from('books').select('*')")
    ).toBe(0);
  });

  it("profiles 를 select('*') 나 select() 로 읽지 않는다", () => {
    const offenders = files
      .filter((file) => findWildcardSelects(readFileSync(file, 'utf8')) > 0)
      .map((file) => file.slice(APP_ROOT.length));

    expect(offenders).toEqual([]);
  });
});
